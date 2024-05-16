import {
    type AppAgentClient,
    type EntryHash,
    type AgentPubKeyB64,
    type AppAgentCallZomeRequest,
    type RoleName,
    encodeHashToBase64,
    type EntryHashB64,
    type AgentPubKey,
    decodeHashFromBase64,
    type Timestamp,
    type DnaHash,
  } from '@holochain/client';
import { SynStore,  SynClient} from '@holochain-syn/core';
import { BoardList } from './boardList';
import { MirrorList } from './mirrorList';
import TimeAgo from "javascript-time-ago"
import en from 'javascript-time-ago/locale/en'
import type { v1 as uuidv1 } from "uuid";
import { get, writable, type Unsubscriber, type Writable } from "svelte/store";
import type { ProfilesStore } from '@holochain-open-dev/profiles';
import type { BoardState } from './board';
import type { WeClient } from '@lightningrodlabs/we-applet';
import { HoloHashMap } from '@holochain-open-dev/utils';
import { getMyDna } from './util';


TimeAgo.addDefaultLocale(en)

const ZOME_NAME = 'syn'

export class TablesService {
    constructor(public client: AppAgentClient, public roleName, public zomeName = ZOME_NAME) {}

    private callZome(fnName: string, payload: any) {
        const req: AppAgentCallZomeRequest = {
            role_name: this.roleName,
            zome_name: this.zomeName,
            fn_name: fnName,
            payload
          }
        return this.client.callZome(req);
    }
}

export enum SeenType {
    Tip="t",
    Comment="c",
}

export interface UIProps {
    showArchived: {[key: string]: boolean},
    showMenu: boolean,
    tips: HoloHashMap<EntryHash,EntryHash>,
    latestComment: {[key: string]: Timestamp}
  }

export class TablesStore {
    myAgentPubKeyB64: AgentPubKeyB64
    timeAgo = new TimeAgo('en-US')
    service: TablesService;
    boardList: BoardList;
    mirrorList: MirrorList;
    updating = false
    synStore: SynStore;
    client: AppAgentClient;
    uiProps: Writable<UIProps>
    unsub: Unsubscriber
    dnaHash: DnaHash

    constructor(
        public weClient : WeClient,
        public profilesStore: ProfilesStore,
        protected clientIn: AppAgentClient,
        protected roleName: RoleName,
        protected zomeName: string = ZOME_NAME
    ) {
        this.client = clientIn
        getMyDna(roleName, clientIn).then(res=>{
            this.dnaHash = res
          })

        this.myAgentPubKeyB64 = encodeHashToBase64(this.client.myPubKey);
        this.service = new TablesService(
          this.client,
          this.roleName,
          this.zomeName
        );
        this.synStore = new SynStore(new SynClient(this.client,this.roleName,this.zomeName))
        this.boardList = new BoardList(profilesStore, this.synStore, weClient)
        this.mirrorList = new MirrorList(profilesStore, this.synStore, weClient)
        this.boardList.activeBoard.subscribe((board)=>{
            if (this.unsub) {
                this.unsub()
                this.unsub = undefined
            }
            if (board != undefined) {
                this.unsub = board.workspace.tip.subscribe((tip)=>{
                    if (tip.status == "complete" && tip.value) {
                        this.updateSeenTip(board.hash, tip.value.entryHash)
                    }
                })
            }
        })
        this.mirrorList.activeMirror.subscribe((mirror)=>{
            if (this.unsub) {
                this.unsub()
                this.unsub = undefined
            }
            if (mirror != undefined) {
                this.unsub = mirror.workspace.tip.subscribe((tip)=>{
                    if (tip.status == "complete" && tip.value) {
                        this.updateSeenTip(mirror.hash, tip.value.entryHash)
                    }
                })
            }
        })
        this.uiProps = writable({
            showArchived: {},
            showMenu: true,
            tips: new HoloHashMap,
            latestComment: {}
        })
        for (let i = 0; i < localStorage.length; i+=1){
            const key = localStorage.key(i)
            const [type, boardHashB64, cardId] = key.split(":")
            if (type == SeenType.Tip) {
                const tipB64 = localStorage.getItem(key)
                this.setSeenTip(decodeHashFromBase64(boardHashB64), decodeHashFromBase64(tipB64))
            } else if (type == SeenType.Comment) {
                const timestampStr = localStorage.getItem(key)
                this.setLatestComment(decodeHashFromBase64(boardHashB64),cardId, parseInt(timestampStr))
            }
        }

    }

    updateSeenTip(boardHash: EntryHash, tip:EntryHash) {
        if (boardHash && tip) {
            localStorage.setItem(`${SeenType.Tip}:${encodeHashToBase64(boardHash)}`, encodeHashToBase64(tip))
            this.setSeenTip(boardHash, tip)
        }
    }

    setSeenTip(boardHash:EntryHash, tip: EntryHash) {
        this.uiProps.update((n) => {
            n.tips.set(boardHash,tip)
            return n
        })
    }

    updateLatestComment(boardHash: EntryHash, cardId:uuidv1, timestamp:Timestamp) {
        localStorage.setItem(`${SeenType.Comment}:${encodeHashToBase64(boardHash)}:${cardId}`, `${timestamp}`)
        this.setLatestComment(boardHash,cardId,timestamp)
    }

    setLatestComment(boardHash: EntryHash, cardId:uuidv1, timestamp:Timestamp) {
        this.uiProps.update((n) => {
            n.latestComment[`${encodeHashToBase64(boardHash)}:${cardId}`] = timestamp
            return n
        })
    }

    getLatestComment(boardHash: EntryHash, cardId:uuidv1) : Timestamp {
        return get(this.uiProps).latestComment[`${encodeHashToBase64(boardHash)}:${cardId}`]
    }

    setUIprops(props:{}) {
        this.uiProps.update((n) => {
            Object.keys(props).forEach(key=>n[key] = props[key])
            return n
        })
    }

    async setActiveBoard(hash: EntryHash | undefined) {
        const board = await this.boardList.setActiveBoard(hash)
        // let bgUrl = ""
        // if (board) {
        //     const state = board.state()
        //     if (state) {
        //         bgUrl = state.props.bgUrl
        //     }
        // }
        this.setUIprops({showMenu:false/*, bgUrl*/})
    }

    async setActiveMirror(hash: EntryHash | undefined) {
        const mirror = await this.mirrorList.setActiveMirror(hash)
        this.setUIprops({showMenu:false})
    }

    async closeActiveBoard(leave: boolean) {
        await this.boardList.closeActiveBoard(leave)
        this.setUIprops({showMenu:true, bgUrl:""})
    }

    async closeActiveMirror(leave: boolean) {
        await this.mirrorList.closeActiveMirror(leave)
        this.setUIprops({showMenu:true, bgUrl:""})
    }

    async archiveBoard(documentHash: EntryHash) {
        const wasActive = this.boardList.archiveBoard(documentHash)
        if (wasActive ) {
            this.setUIprops({showMenu:true, bgUrl:""})
        }
    }

    get myAgentPubKey(): AgentPubKey {
        return this.client.myPubKey;
    }

}