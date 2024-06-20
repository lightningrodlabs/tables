import { HoloHashMap, LazyHoloHashMap } from "@holochain-open-dev/utils";
import { derived, get, writable, type Readable, type Writable } from "svelte/store";
import { type AgentPubKey, type EntryHash, type EntryHashB64, encodeHashToBase64 } from "@holochain/client";
import {toPromise, type AsyncReadable, pipe, joinAsync, asyncDerived, sliceAndJoin, alwaysSubscribed} from '@holochain-open-dev/stores'
import { SynStore, WorkspaceStore, type Commit, stateFromCommit } from "@holochain-syn/core";
import type { ProfilesStore } from "@holochain-open-dev/profiles";
import { cloneDeep } from "lodash";
import { Mirror, feedItems, type MirrorDelta, type MirrorState, deltaToFeedString, type RowId } from "./mirror";
import { hashEqual } from "./util";
import type { WeaveClient } from "@lightningrodlabs/we-applet";
import { SeenType } from "./store";

export enum MirrorType {
    active = "activeMirror",
    archived = "archivedMirror"
}

export interface TypedHash {
    hash: EntryHash
    type: MirrorType
}

export interface MirrorAndLatestState {
    mirror: Mirror,
    latestState: MirrorState,
    tip: EntryHash,
}

export class MirrorList {
    activeRow: Writable<RowId| undefined> = writable(undefined)
    activeMirrorHashes: AsyncReadable<EntryHash[]>
    archivedMirrorHashes: AsyncReadable<EntryHash[]>
 //   typedHashes: AsyncReadable<Array<TypedHash>>
    activeMirror: Writable<Mirror| undefined> = writable(undefined)
    allMirrors: AsyncReadable<ReadonlyMap<Uint8Array, MirrorAndLatestState>>
    activeMirrorHash: Writable<EntryHash| undefined> = writable(undefined)
    activeMirrorHashB64: Readable<string| undefined> = derived(this.activeMirrorHash, s=> s ? encodeHashToBase64(s): undefined)
    mirrorCount: AsyncReadable<number>
    notifiedItems = {}

    mirrorData2 = new LazyHoloHashMap( documentHash => {
        const docStore = this.synStore.documents.get(documentHash)

        const mirror = pipe(docStore.allWorkspaces,
            workspaces => {
                const mirror = new Mirror(docStore,  new WorkspaceStore(docStore, Array.from(workspaces.keys())[0]), this.synStore.client.client.myPubKey)
                if (this.weClient) {
                    mirror.workspace.tip.subscribe((tip)=>{
                        try {
                            if (tip.status=="complete" && tip.value) {
                                const tipRecord = tip.value
                                const tipB64 = encodeHashToBase64(tipRecord.entryHash)
                                const key = `${SeenType.Tip}:${mirror.hashB64}`
                                const seenTipB64 = localStorage.getItem(key)

                                if (tipB64 != seenTipB64) {
                                    const mirrorState = stateFromCommit(tipRecord.entry) as MirrorState
                                    const feed = feedItems(mirrorState.feed)
                                    const me = encodeHashToBase64(this.synStore.client.client.myPubKey)
                                    feed.forEach(feedItem=> {
                                        const key = `${feedItem.author}.${feedItem.timestamp.getTime()}`
                                        if (! this.notifiedItems[key] ) {
                                            let body = `${feedItem.author} ${deltaToFeedString(mirrorState, feedItem.content)}`
                                            this.weClient.notifyFrame([{
                                                title: `${mirrorState.name} updated`,
                                                body,
                                                notification_type: "change",
                                                icon_src: undefined,
                                                urgency: "low",
                                                timestamp: Date.now()
                                            }
                                            ])
                                            this.notifiedItems[key] = true
                                        }
                                    })
                                }
                            }
                        } catch(e) {
                            console.log("Error notifying We", e)
                        }
                    })
                }
                return mirror
            }
        )
        const latestState = pipe(mirror, 
            mirror => mirror.workspace.latestState
            )
        const tip = pipe(mirror,
            mirror => mirror.workspace.tip
            )

        return alwaysSubscribed(pipe(joinAsync([mirror, latestState, tip]), ([mirror, latestState, tip]) => {
            return {mirror,latestState, tip: tip ? tip.entryHash: undefined}}))
    })


    agentMirrorHashes: LazyHoloHashMap<AgentPubKey, AsyncReadable<Array<MirrorAndLatestState>>> = new LazyHoloHashMap(agent =>
        pipe(this.activeMirrorHashes,
            documentHashes => joinAsync(documentHashes.map(documentHash=>this.synStore.documents.get(documentHash).allAuthors), {errors: "filter_out"}),
            (documentsAuthors, documentHashes) => {
                const agentMirrorHashes: AsyncReadable<MirrorAndLatestState>[] = []
                const b64 = encodeHashToBase64(agent)
                for (let i = 0; i< documentsAuthors.length; i+=1) {
                    if (documentsAuthors[i].find(a=>encodeHashToBase64(a) == b64)) {
                        const hash = documentHashes[i]
                        //const state = this.mirrorData2.get(hash).workspace.latestSnapshot
                        //agentDocuments.push(asyncDerived(state, state=>{return {hash, state}}))
                        const x = this.mirrorData2.get(hash)
                        if (x) {
                            console.log("agentMirrorHashes")
                            agentMirrorHashes.push(x)
                        }
                    }
                }
                return joinAsync(agentMirrorHashes, {errors: "filter_out"})
            },
        )
    )
        
    allAgentMirrors: AsyncReadable<ReadonlyMap<AgentPubKey, Array<MirrorAndLatestState>>>
    allAuthorAgents: AsyncReadable<AgentPubKey[]>

    constructor(public profilseStore: ProfilesStore, public synStore: SynStore, public weClient : WeaveClient) {
        this.allAgentMirrors = pipe(this.profilseStore.agentsWithProfile,
            agents=>{
                console.log("allAgentMirrors")
                return sliceAndJoin(this.agentMirrorHashes, agents, {errors: "filter_out"})
            }
        )
   
        const mirrorHashes = asyncDerived(this.synStore.documentsByTag.get(MirrorType.active),x=>Array.from(x.keys()))
        this.activeMirrorHashes = mirrorHashes
        const archivedHashes = asyncDerived(this.synStore.documentsByTag.get(MirrorType.archived),x=>Array.from(x.keys()))
        this.archivedMirrorHashes = archivedHashes

        const allDocumentAuthors = pipe(this.activeMirrorHashes,
            documentHashes => joinAsync(documentHashes.map(documentHash=>this.synStore.documents.get(documentHash).allAuthors), {errors: "filter_out"}),
            )
        this.allAuthorAgents = asyncDerived(allDocumentAuthors, (docAuthors) => {
            const authors: HoloHashMap<AgentPubKey, boolean> = new HoloHashMap()
            for (let v of Array.from(docAuthors.values())) {
                v.forEach((a)=> authors.set(a, true))
            }
            return Array.from(authors.keys())
        })

        // const activeTypedHashes = asyncDerived(mirrorHashes, hashes=>hashes.map(hash=>{const h:TypedHash = {hash, type:MirrorType.active}; return h}))
        // const archivedTypedHashes = asyncDerived(archivedHashes, hashes=>hashes.map(hash=>{const h:TypedHash = {hash,type:MirrorType.archived}; return h}))

        // const joinedTyped = joinAsync([activeTypedHashes, archivedTypedHashes])
        // this.typedHashes = asyncDerived(joinedTyped, 
        //     ([active,archived]) => [...active, ...archived]
        //     )

        const joined = joinAsync([mirrorHashes, archivedHashes])

        const asyncJoined = asyncDerived(joined, 
            ([mirrors,archived]) => [...mirrors, ...archived]
            )
        this.allMirrors = pipe(asyncJoined,
            docHashes => {
                return sliceAndJoin(this.mirrorData2, docHashes, {errors: "filter_out"})
            }
        )
        this.mirrorCount =  asyncDerived(joined,
            ([mirrors,archived]) => mirrors.length + archived.length
        )
    }
    
    async getMirror(documentHash: EntryHash) : Promise<Mirror | undefined> {
        if (!documentHash) return undefined
        const mirror = await toPromise(this.mirrorData2.get(documentHash))
        return mirror.mirror
    }

    async setActiveRow(rowId: string | undefined) {
        this.activeRow.update((n) => {return rowId} )
    }

    async setActiveMirror(hash: EntryHash | undefined) : Promise<Mirror | undefined> {
        let mirror: Mirror | undefined = undefined
        const current = get(this.activeMirror)
        // if no change then don't update
        if (!current && !hash) return
        if (current && hash && hashEqual(hash, current.hash)) return

        if (hash) {
            mirror = (await toPromise(this.mirrorData2.get(hash))).mirror
            if (mirror) {
                await mirror.join()
                console.log("joined")
                this.activeMirror.update((n) => {return mirror} )
            } else {
                console.log("NO BOARD")
            }
        } else {
            this.activeMirror.update((n) => {return undefined} )
        }
        this.activeMirrorHash.update((n) => {return hash} )

        return mirror
    }

    async archiveMirror(documentHash: EntryHash) : Promise<boolean> {
        let wasActive = false
        await this.synStore.client.removeDocumentTag(documentHash, MirrorType.active)
        await this.synStore.client.tagDocument(documentHash, MirrorType.archived)
        if (encodeHashToBase64(get(this.activeMirrorHash)) == encodeHashToBase64(documentHash)) {
            await this.setActiveMirror(undefined)
            wasActive = true
        }
        return wasActive
    }

    async unarchiveMirror(documentHash: EntryHash) {
        await this.synStore.client.removeDocumentTag(documentHash, MirrorType.archived)
        await this.synStore.client.tagDocument(documentHash, MirrorType.active)
    }

    async closeActiveMirror(leave: boolean) {
        const hash = get(this.activeMirrorHash)
        if (hash) {
            if (leave) {
                const mirror = await this.getMirror(hash)
                if (mirror) await mirror.leave()
                else console.log("Mirror Not Found!")
            }
            this.setActiveMirror(undefined)
        }
    }

    async cloneMirror(mirror: MirrorState) : Promise<Mirror>  {
        const newMirror = cloneDeep(mirror) as MirrorState
        newMirror.rows = []
        newMirror.name = `copy of ${newMirror.name}`
        return this.makeMirror(newMirror)
    }

    async makeMirror(options: Partial<MirrorState>, fromHash?: EntryHashB64) : Promise<Mirror> {
        if (!options.name) {
            options.name = "untitled"
        }
        const mirror = await Mirror.Create(this.synStore, options)
        return mirror
    }
}
