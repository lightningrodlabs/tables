import type { DocumentStore, SessionStore, WorkspaceStore, SynStore } from "@holochain-syn/core";
import { get, type Readable } from "svelte/store";
import { v1 as uuidv1 } from "uuid";
import { type AgentPubKey, type EntryHash, type EntryHashB64, encodeHashToBase64, type AgentPubKeyB64, type Timestamp } from "@holochain/client";
import { BoardType } from "./boardList";
import type { WALUrl } from "./util";
import { cloneDeep } from "lodash";
import { reorder } from "svelte-dnd-list";

export class LabelDef {
    type: uuidv1
    constructor(public emoji: string, public toolTip: string){
        this.type = uuidv1()
    }
}

export enum ColumnType {
  String,
  Number,
  Date,
  Email,
  URL,
  User,
  TableLink,
  WeaveAsset,
}

export enum SumType {
  None,
  Sum,
  Count,
  Average,
  Max,
  Min,
  Median,
  Mode,
  Range,
  StDeviation,
  Variance,
  Percentile,
  Filled,
  Empty,
  Unique,
}

export class ColumnDef {
  id: ColumnId
  constructor(public name: string, public type: ColumnType, public sumType: SumType, public unique: boolean, public linkedTable?: EntryHashB64, public keyColumn?: ColumnId, public displayColumn?: ColumnId){
      this.id = uuidv1()
  }
}

export type RowProps = {
  attachments: Array<WALUrl>
}

export type RowId = uuidv1
export type ColumnId = uuidv1

export class Row {
  id: RowId
  props: RowProps = {attachments:[]}
  constructor(public creator: AgentPubKeyB64, public cells: {[key: string]: Cell}) { // key is the column id
      this.id = uuidv1()
  }
}

export type CellValue = string|number|Date|AgentPubKeyB64|null|WALUrl

export type CellId = {
  rowId: RowId,
  columnId: ColumnId,
}

export type Cell = {
  value: CellValue ,
  attachments: Array<WALUrl>
}

export type BoardProps = {
  bgUrl: string,
  attachments: Array<WALUrl>
}

const MAX_FEED_ITEMS = 50
export type FeedContent = {
  delta: BoardDelta,
  context: any,  // used to hold info important to generating the feed item description
}

export type FeedItem = {
  timestamp: Date,
  content: FeedContent,
  author: AgentPubKeyB64,
}

export type ParsedFeedKey = {
  author: AgentPubKeyB64,
  timestamp: number,
}

export type Feed = {[key: string]: FeedContent}  // key is agent and timestamp to make unique feed keys to prevent collisions

export type BoardEphemeralState = { [key: string]: string };

export const parseFeedKey = (key: string) : ParsedFeedKey => {
  const [author, timestamp] = key.split(".")
  return {author, timestamp: parseInt(timestamp)}
}

export const sortedFeedKeys = (feed: Feed) => {
  const keys = Object.keys(feed)
  return keys.map(key=> parseFeedKey(key)).sort(({timestamp:a},{timestamp:b})=>b-a)
}

export const feedItems = (feed: Feed): FeedItem[] => {
  if (!feed) return []
  const parsedKeys: ParsedFeedKey[] = sortedFeedKeys(feed)
  return parsedKeys.map(({timestamp, author})=> {
    const content = feed[`${author}.${timestamp}`]
    const item: FeedItem = {author,timestamp:new Date(timestamp), content}
    return item
  })
}

export interface BoardState {
  status: string;
  name: string;
  rows: Array<Row>;
  labelDefs: LabelDef[];
  columnDefs: ColumnDef[];
  props: BoardProps;
  boundTo: Array<WALUrl>
  feed: Feed
}
  
  export type BoardDelta =
    | {
        type: "create";
        name: string;
      }
    | {
        type: "set-state";
        state: Partial<BoardState>;
      }
    | {
        type: "set-status";
        status: string;
      }
    | {
        type: "add-row";
        row: Row;
      }
    | {
        type: "update-row-props";
        id: RowId,
        props: RowProps;
      }
    | {
      type: "delete-row";
      id: RowId,
    }
    | {
        type: "set-name";
        name: string;
      }
    | {
        type: "set-cell";
        cellId: CellId;
        value: CellValue;
      }
    | {
        type: "set-props";
        props: BoardProps;
      }
    | {
        type: "set-label-defs";
        labelDefs: LabelDef[];
      }
    | {
        type: "add-column";
        name: string;
        columnType: ColumnType;
        sumType: SumType;
        unique?: boolean;
        linkedTable?: EntryHashB64;
        keyColumn?: ColumnId;
        displayColumn?: ColumnId;
      }
    | {
        type: "set-column-defs";
        columnDefs: ColumnDef[];
      }
    | {
        type: "set-column-order";
        id: uuidv1;
        order: Array<uuidv1>;
      }


  export const newFeedKey = (author) :string => {
    return `${author}.${Date.now()}`
  }
  const addToFeed = (state: BoardState, author: AgentPubKeyB64, delta: BoardDelta, context: any): BoardState => {
    if (!state.feed) state.feed = {}
    
    state.feed[newFeedKey(author)] = {delta, context}
    const keys = Object.keys(state)
    if (keys.length > MAX_FEED_ITEMS) {
      const keysToRemove = keys.map(key=>{
        const [auth, date] = key.split(".")
        return [auth,parseInt(date)]
      }).sort(([_x, a],[_y,b]) => 
        // @ts-ignore
        a-b).slice(MAX_FEED_ITEMS)
      keysToRemove.forEach( ([a,d])=> delete state.feed[`${a}.${d}`])
    }
    return state
  }

  export const deltaToFeedString = (state: BoardState, content: FeedContent):string => {
    const delta = content.delta
    const context = content.context
    let feedText = ""
    switch (delta.type) {
      case "create": 
        feedText = `created board ${delta.name}`
        break;
      case "set-status": 
        feedText = `set the board status to ${delta.status}`
        break;
      case "set-state":
        feedText = `set the board `
        break;
      case "set-name":
        feedText = `set the board name to ${delta.name}`
        break;
      case "set-props":
        feedText = `upated the board settings`
        break;
      case "set-column-order":
        feedText = `reorded the columns`
        break;
      case "add-row":
        feedText = `added a row`
        break;
      case "delete-row":
        feedText = `deleted a row`
        break;
      case "add-column":
        feedText = `added a column`
        break;
      case "set-label-defs":
        feedText = `updated the labels`
        break;
      case "set-column-defs":
        feedText = `updated the columns`
        break;
      case "set-cell":
        feedText = `updated a cell`
        break;

    }
    return feedText
  }

  export const boardGrammar = {
    initialState(init: Partial<BoardState>|undefined = undefined)  {
      const state: BoardState = {
        status: "",
        name: "untitled",
        rows: [],
        labelDefs: [],
        columnDefs: [],
        props: {bgUrl:"", attachments:[]},
        boundTo: [],
        feed: {}
      }
      if (init) {
        Object.assign(state, init);
      }
      return state
    },

    applyDelta( 
      delta: BoardDelta,
      state: BoardState,
      _ephemeralState: any,
      author: AgentPubKeyB64
    ) {
      let feedContext = null
      switch (delta.type) {
        case "set-status":
          state.status = delta.status
          break;
        case "set-state":
          if (delta.state.status !== undefined) state.status = delta.state.status
          if (delta.state.name !== undefined) state.name = delta.state.name
          if (delta.state.labelDefs !== undefined) state.labelDefs = delta.state.labelDefs
          if (delta.state.columnDefs !== undefined) state.columnDefs = delta.state.columnDefs
          if (delta.state.rows !== undefined) state.rows = delta.state.rows
          if (delta.state.props !== undefined) state.props = delta.state.props
          if (delta.state.boundTo !== undefined) state.boundTo = delta.state.boundTo
          break;
        case "set-name":
          state.name = delta.name
          break;
        case "set-props":
          state.props = delta.props
          break;
        case "set-label-defs":
          state.labelDefs = delta.labelDefs
          break;
        case "set-column-defs":
          state.columnDefs = delta.columnDefs
          break;
        case "set-column-order":
          
          break;
        case "add-row":
          state.rows.push(delta.row)
          break;
        case "delete-row":
          const idx = state.rows.findIndex(row => row.id === delta.id)
          if (idx >= 0) {
            state.rows.splice(idx,1)
          }
          break;
        case "add-column":
          console.log("ADDING COLUMN", delta)
          state.columnDefs.push(new ColumnDef(delta.name, delta.columnType, delta.sumType, delta.unique, delta.linkedTable, delta.keyColumn, delta.displayColumn))
          break;
        case "update-row-props":
          const rowIdx = state.rows.findIndex(row => row.id === delta.id)
          if (rowIdx >=0) {
            state.rows[rowIdx].props = delta.props
          }
          break;
        case "set-cell":
          for (let i = 0; i< state.rows.length; i+=1) {
            if (state.rows[i].id == delta.cellId.rowId) {
              let cell = state.rows[i].cells[delta.cellId.columnId]
              if (cell) {
                cell = cloneDeep(cell)
                cell.value = delta.value
              } else {
                cell = {value:delta.value, attachments: []}
              }
              state.rows[i].cells[delta.cellId.columnId] = cell
            }
          }
          break;
      }
      state = addToFeed(state, author, delta, feedContext)
    },
  };
  
export type BoardStateData = {
  hash: EntryHash,
  state: BoardState,
}
  
export class Board {
  public session: SessionStore<BoardState,BoardEphemeralState> | undefined
  public hashB64: EntryHashB64
  public myAgentKeyB64: AgentPubKeyB64

  constructor(
    public document: DocumentStore<BoardState, BoardEphemeralState>, 
    public workspace: WorkspaceStore<BoardState,BoardEphemeralState>,
    public myAgentKey: AgentPubKey
    ) {
      this.hashB64 = encodeHashToBase64(this.document.documentHash)
      this.myAgentKeyB64 = encodeHashToBase64(myAgentKey)
    }

  public static async Create(synStore: SynStore, init: Partial<BoardState>|undefined = undefined) {
    const initState = boardGrammar.initialState(init)
  
    const documentStore = await synStore.createDocument(initState,{})

    await synStore.client.tagDocument(documentStore.documentHash, BoardType.active)

    const workspaceStore = await documentStore.createWorkspace(
        `${new Date}`,
        undefined
       );

    const me = new Board(documentStore, workspaceStore, synStore.client.client.myPubKey);

    return me
  }

  get hash() : EntryHash {
    return this.document.documentHash
  }

  async join() {
    if (! this.session) 
      this.session = await this.workspace.joinSession()
    console.log("JOINED", this.session)
  }
  
  async leave() {
    if (this.session) {
      this.session.leaveSession()
      this.session = undefined
      console.log("LEFT SESSION")
    }
  }

  state(): BoardState | undefined {
      if (!this.session) {
        return undefined
      } else {
        return get(this.session.state)
      }
  }

  readableState(): Readable<BoardState> | undefined {
    if (!this.session) {
      return undefined
    } else {
      return this.session.state
    }
  }

  requestChanges(deltas: Array<BoardDelta>) {
      console.log("REQUESTING BOARD CHANGES: ", deltas)
      this.session.change((state,_eph)=>{
        for (const delta of deltas) {
          try {
            boardGrammar.applyDelta(delta, state,_eph, this.myAgentKeyB64)
          } catch (e) {
            console.log("Error applying delta:",e, delta)
          }
        }
      })
  }

  sessionParticipants() {
    return this.workspace.sessionParticipants
  }

  participants()  {
    if (!this.session) {
      return undefined
    } else {
      return this.session._participants
    }
  }
  async commitChanges() {
      this.session.commitChanges()
  }

}
