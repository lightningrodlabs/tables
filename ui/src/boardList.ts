import { HoloHashMap, LazyHoloHashMap } from "@holochain-open-dev/utils";
import { derived, get, writable, type Readable, type Writable } from "svelte/store";
import { type AgentPubKey, type EntryHash, type EntryHashB64, encodeHashToBase64 } from "@holochain/client";
import {toPromise, type AsyncReadable, pipe, joinAsync, asyncDerived, sliceAndJoin, alwaysSubscribed} from '@holochain-open-dev/stores'
import { SynStore, WorkspaceStore, type Commit, stateFromCommit } from "@holochain-syn/core";
import type { ProfilesStore } from "@holochain-open-dev/profiles";
import { cloneDeep } from "lodash";
import { Board, feedItems, type BoardDelta, type BoardState, deltaToFeedString, type RowId } from "./board";
import { hashEqual } from "./util";
import type { WeaveClient } from "@lightningrodlabs/we-applet";
import { SeenType } from "./store";

export enum BoardType {
    active = "active",
    archived = "archived"
}

export interface TypedHash {
    hash: EntryHash
    type: BoardType
}

export interface BoardAndLatestState {
    board: Board,
    latestState: BoardState,
    tip: EntryHash,
}

export class BoardList {
    activeRow: Writable<RowId| undefined> = writable(undefined)
    activeBoardHashes: AsyncReadable<EntryHash[]>
    archivedBoardHashes: AsyncReadable<EntryHash[]>
 //   typedHashes: AsyncReadable<Array<TypedHash>>
    activeBoard: Writable<Board| undefined> = writable(undefined)
    allBoards: AsyncReadable<ReadonlyMap<Uint8Array, BoardAndLatestState>>
    activeBoardHash: Writable<EntryHash| undefined> = writable(undefined)
    activeBoardHashB64: Readable<string| undefined> = derived(this.activeBoardHash, s=> s ? encodeHashToBase64(s): undefined)
    boardCount: AsyncReadable<number>
    notifiedItems = {}

    boardData2 = new LazyHoloHashMap( documentHash => {
        const docStore = this.synStore.documents.get(documentHash)

        const board = pipe(docStore.allWorkspaces,
            workspaces => {
                const board = new Board(docStore,  new WorkspaceStore(docStore, Array.from(workspaces.keys())[0]), this.synStore.client.client.myPubKey)
                if (this.weClient) {
                    board.workspace.tip.subscribe((tip)=>{
                        try {
                            if (tip.status=="complete" && tip.value) {
                                const tipRecord = tip.value
                                const tipB64 = encodeHashToBase64(tipRecord.entryHash)
                                const key = `${SeenType.Tip}:${board.hashB64}`
                                const seenTipB64 = localStorage.getItem(key)

                                if (tipB64 != seenTipB64) {
                                    const boardState = stateFromCommit(tipRecord.entry) as BoardState
                                    const feed = feedItems(boardState.feed)
                                    const me = encodeHashToBase64(this.synStore.client.client.myPubKey)
                                    feed.forEach(feedItem=> {
                                        const key = `${feedItem.author}.${feedItem.timestamp.getTime()}`
                                        if (! this.notifiedItems[key] ) {
                                            let body = `${feedItem.author} ${deltaToFeedString(boardState, feedItem.content)}`
                                            this.weClient.notifyFrame([{
                                                title: `${boardState.name} updated`,
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
                return board
            }
        )
        const latestState = pipe(board, 
            board => board.workspace.latestState
            )
        const tip = pipe(board,
            board => board.workspace.tip
            )

        return alwaysSubscribed(pipe(joinAsync([board, latestState, tip]), ([board, latestState, tip]) => {
            return {board,latestState, tip: tip ? tip.entryHash: undefined}}))
    })


    agentBoardHashes: LazyHoloHashMap<AgentPubKey, AsyncReadable<Array<BoardAndLatestState>>> = new LazyHoloHashMap(agent =>
        pipe(this.activeBoardHashes,
            documentHashes => joinAsync(documentHashes.map(documentHash=>this.synStore.documents.get(documentHash).allAuthors), {errors: "filter_out"}),
            (documentsAuthors, documentHashes) => {
                const agentBoardHashes: AsyncReadable<BoardAndLatestState>[] = []
                const b64 = encodeHashToBase64(agent)
                for (let i = 0; i< documentsAuthors.length; i+=1) {
                    if (documentsAuthors[i].find(a=>encodeHashToBase64(a) == b64)) {
                        const hash = documentHashes[i]
                        //const state = this.boardData2.get(hash).workspace.latestSnapshot
                        //agentDocuments.push(asyncDerived(state, state=>{return {hash, state}}))
                        const x = this.boardData2.get(hash)
                        if (x) {
                            console.log("agentBoardHashes")
                            agentBoardHashes.push(x)
                        }
                    }
                }
                return joinAsync(agentBoardHashes, {errors: "filter_out"})
            },
        )
    )
        
    allAgentBoards: AsyncReadable<ReadonlyMap<AgentPubKey, Array<BoardAndLatestState>>>
    allAuthorAgents: AsyncReadable<AgentPubKey[]>

    constructor(public profilseStore: ProfilesStore, public synStore: SynStore, public weClient : WeaveClient) {
        this.allAgentBoards = pipe(this.profilseStore.agentsWithProfile,
            agents=>{
                console.log("allAgentBoards")
                return sliceAndJoin(this.agentBoardHashes, agents, {errors: "filter_out"})
            }
        )
   
        const boardHashes = asyncDerived(this.synStore.documentsByTag.get(BoardType.active),x=>Array.from(x.keys()))
        this.activeBoardHashes = boardHashes
        const archivedHashes = asyncDerived(this.synStore.documentsByTag.get(BoardType.archived),x=>Array.from(x.keys()))
        this.archivedBoardHashes = archivedHashes

        const allDocumentAuthors = pipe(this.activeBoardHashes,
            documentHashes => joinAsync(documentHashes.map(documentHash=>this.synStore.documents.get(documentHash).allAuthors), {errors: "filter_out"}),
            )
        this.allAuthorAgents = asyncDerived(allDocumentAuthors, (docAuthors) => {
            const authors: HoloHashMap<AgentPubKey, boolean> = new HoloHashMap()
            for (let v of Array.from(docAuthors.values())) {
                v.forEach((a)=> authors.set(a, true))
            }
            return Array.from(authors.keys())
        })

        // const activeTypedHashes = asyncDerived(boardHashes, hashes=>hashes.map(hash=>{const h:TypedHash = {hash, type:BoardType.active}; return h}))
        // const archivedTypedHashes = asyncDerived(archivedHashes, hashes=>hashes.map(hash=>{const h:TypedHash = {hash,type:BoardType.archived}; return h}))

        // const joinedTyped = joinAsync([activeTypedHashes, archivedTypedHashes])
        // this.typedHashes = asyncDerived(joinedTyped, 
        //     ([active,archived]) => [...active, ...archived]
        //     )

        const joined = joinAsync([boardHashes, archivedHashes])

        const asyncJoined = asyncDerived(joined, 
            ([boards,archived]) => [...boards, ...archived]
            )
        this.allBoards = pipe(asyncJoined,
            docHashes => {
                return sliceAndJoin(this.boardData2, docHashes, {errors: "filter_out"})
            }
        )
        this.boardCount =  asyncDerived(joined,
            ([boards,archived]) => boards.length + archived.length
        )
    }
    
    async getBoard(documentHash: EntryHash) : Promise<Board | undefined> {
        if (!documentHash) return undefined
        const board = await toPromise(this.boardData2.get(documentHash))
        return board.board
    }

    async setActiveRow(rowId: string | undefined) {
        this.activeRow.update((n) => {return rowId} )
    }

    async setActiveBoard(hash: EntryHash | undefined) : Promise<Board | undefined> {
        let board: Board | undefined = undefined
        const current = get(this.activeBoard)
        // if no change then don't update
        if (!current && !hash) return
        if (current && hash && hashEqual(hash, current.hash)) return

        if (hash) {
            board = (await toPromise(this.boardData2.get(hash))).board
            if (board) {
                await board.join()
                console.log("joined")
                this.activeBoard.update((n) => {return board} )
            } else {
                console.log("NO BOARD")
            }
        } else {
            this.activeBoard.update((n) => {return undefined} )
        }
        this.activeBoardHash.update((n) => {return hash} )

        return board
    }

    async archiveBoard(documentHash: EntryHash) : Promise<boolean> {
        let wasActive = false
        await this.synStore.client.removeDocumentTag(documentHash, BoardType.active)
        await this.synStore.client.tagDocument(documentHash, BoardType.archived)
        if (encodeHashToBase64(get(this.activeBoardHash)) == encodeHashToBase64(documentHash)) {
            await this.setActiveBoard(undefined)
            wasActive = true
        }
        return wasActive
    }

    async unarchiveBoard(documentHash: EntryHash) {
        await this.synStore.client.removeDocumentTag(documentHash, BoardType.archived)
        await this.synStore.client.tagDocument(documentHash, BoardType.active)
    }

    async closeActiveBoard(leave: boolean) {
        const hash = get(this.activeBoardHash)
        if (hash) {
            if (leave) {
                const board = await this.getBoard(hash)
                if (board) await board.leave()
                else console.log("Board Not Found!")
            }
            this.setActiveBoard(undefined)
        }
    }

    async cloneBoard(board: BoardState) : Promise<Board>  {
        const newBoard = cloneDeep(board) as BoardState
        newBoard.rows = []
        newBoard.name = `copy of ${newBoard.name}`
        return this.makeBoard(newBoard)
    }

    async makeBoard(options: Partial<BoardState>, fromHash?: EntryHashB64) : Promise<Board> {
        if (!options.name) {
            options.name = "untitled"
        }
        const board = await Board.Create(this.synStore, options)
        return board
    }
}
