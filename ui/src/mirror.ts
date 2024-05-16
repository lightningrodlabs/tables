import type { DocumentStore, SessionStore, WorkspaceStore, SynStore } from "@holochain-syn/core";
import { get, type Readable } from "svelte/store";
// import { v1 as uuidv1 } from "uuid";
import { type AgentPubKey, type EntryHash, type EntryHashB64, encodeHashToBase64, type AgentPubKeyB64, type Timestamp } from "@holochain/client";
import { MirrorType } from "./mirrorList";
import type { WALUrl } from "./util";
import { cloneDeep } from "lodash";
import { reorder } from "svelte-dnd-list";

export type MirrorProps = {
  bgUrl: string,
  attachments: Array<WALUrl>
}

export type Variable = {
  name: string,
  value: string,
}

const MAX_FEED_ITEMS = 50
export type FeedContent = {
  delta: MirrorDelta,
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

export type MirrorEphemeralState = { [key: string]: string };

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

export interface MirrorState {
  status: string;
  name: string;
  variables: Array<Variable>;
  raw: string;
  props: MirrorProps;
  boundTo: Array<WALUrl>
  feed: Feed
}
  
export type MirrorDelta =
  | {
      type: "create";
      name: string;
      variables: Array<Variable>;
      raw: string;
    }
  | {
      type: "set-state";
      state: Partial<MirrorState>;
    }
  | {
      type: "set-status";
      status: string;
    }
  | {
      type: "set-name";
      name: string;
    }
  | {
      type: "set-props";
      props: MirrorProps;
    }


  export const newFeedKey = (author) :string => {
    return `${author}.${Date.now()}`
  }
  const addToFeed = (state: MirrorState, author: AgentPubKeyB64, delta: MirrorDelta, context: any): MirrorState => {
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

  export const deltaToFeedString = (state: MirrorState, content: FeedContent):string => {
    const delta = content.delta
    const context = content.context
    let feedText = ""
    switch (delta.type) {
      case "create": 
        feedText = `created mirror ${delta.name}`
        break;
      case "set-status": 
        feedText = `set the mirror status to ${delta.status}`
        break;
      case "set-state":
        feedText = `set the mirror `
        break;
      case "set-name":
        feedText = `set the mirror name to ${delta.name}`
        break;
      case "set-props":
        feedText = `upated the mirror settings`
        break;
    }
    return feedText
  }

  export const mirrorGrammar = {
    initialState(init: Partial<MirrorState>|undefined = undefined)  {
      const state: MirrorState = {
        status: "",
        name: "untitled",
        variables: [],
        raw: "",
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
      delta: MirrorDelta,
      state: MirrorState,
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
          if (delta.state.props !== undefined) state.props = delta.state.props
          if (delta.state.boundTo !== undefined) state.boundTo = delta.state.boundTo
          break;
        case "set-name":
          state.name = delta.name
          break;
        case "set-props":
          state.props = delta.props
          break;
      }
      state = addToFeed(state, author, delta, feedContext)
    },
  };
  
export type MirrorStateData = {
  hash: EntryHash,
  state: MirrorState,
}
  
export class Mirror {
  public session: SessionStore<MirrorState,MirrorEphemeralState> | undefined
  public hashB64: EntryHashB64
  public myAgentKeyB64: AgentPubKeyB64

  constructor(
    public document: DocumentStore<MirrorState, MirrorEphemeralState>, 
    public workspace: WorkspaceStore<MirrorState,MirrorEphemeralState>,
    public myAgentKey: AgentPubKey
    ) {
      this.hashB64 = encodeHashToBase64(this.document.documentHash)
      this.myAgentKeyB64 = encodeHashToBase64(myAgentKey)
    }

  public static async Create(synStore: SynStore, init: Partial<MirrorState>|undefined = undefined) {
    const initState = mirrorGrammar.initialState(init)
  
    const documentStore = await synStore.createDocument(initState,{})

    await synStore.client.tagDocument(documentStore.documentHash, MirrorType.active)

    const workspaceStore = await documentStore.createWorkspace(
        `${new Date}`,
        undefined
       );

    const me = new Mirror(documentStore, workspaceStore, synStore.client.client.myPubKey);

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

  state(): MirrorState | undefined {
      if (!this.session) {
        return undefined
      } else {
        return get(this.session.state)
      }
  }

  readableState(): Readable<MirrorState> | undefined {
    if (!this.session) {
      return undefined
    } else {
      return this.session.state
    }
  }

  requestChanges(deltas: Array<MirrorDelta>) {
      console.log("REQUESTING BOARD CHANGES: ", deltas)
      this.session.change((state,_eph)=>{
        for (const delta of deltas) {
          try {
            mirrorGrammar.applyDelta(delta, state,_eph, this.myAgentKeyB64)
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
