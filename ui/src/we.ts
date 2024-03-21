import { DocumentStore, SynClient, SynStore, WorkspaceStore } from '@holochain-syn/core';
import type { BoardEphemeralState, BoardState } from './board';
import { asyncDerived, pipe, sliceAndJoin, toPromise } from '@holochain-open-dev/stores';
import { BoardType } from './boardList';
import { LazyHoloHashMap } from '@holochain-open-dev/utils';
import type { AppletHash, AppletServices, AssetInfo, WAL, WeServices } from '@lightningrodlabs/we-applet';
import { getMyDna } from './util';
import type { AppAgentClient, RoleName, ZomeName } from '@holochain/client';

const ROLE_NAME = "tables"
const ZOME_NAME = "syn"

const TABLE_ICON_SRC = `data:image/svg+xml;utf8,
<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xml:space="preserve"><rect y="22.261" style="fill:%2346F8FF;" width="512" height="467.478"/><rect y="22.261" style="fill:%23005ECE;" width="512" height="133.565"/><path d="M0,22.261v467.478h512V22.261H0z M33.391,155.826h122.435v77.913H33.391V155.826z M189.217,233.739v-77.913h133.565v77.913	H189.217z M322.783,267.13v77.913H189.217V267.13H322.783z M33.391,267.13h122.435v77.913H33.391V267.13z M33.391,456.348v-77.913	h122.435v77.913H33.391z M189.217,456.348v-77.913h133.565v77.913H189.217z M478.609,456.348H356.174v-77.913h122.435V456.348z	 M478.609,345.043H356.174V267.13h122.435V345.043z M478.609,233.739H356.174v-77.913h122.435V233.739z M478.609,122.435H33.391	V55.652h445.217V122.435z"/></svg>`
const CARD_ICON_SRC = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M0 96C0 60.7 28.7 32 64 32H448c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96zm64 0v64h64V96H64zm384 0H192v64H448V96zM64 224v64h64V224H64zm384 0H192v64H448V224zM64 352v64h64V352H64zm384 0H192v64H448V352z"/></svg>`

export const appletServices: AppletServices = {
    // Types of attachment that this Applet offers for other Applets to be created
    creatables: {
      'table': {
        label: "Table",
        icon_src: TABLE_ICON_SRC,
      }
    },

    // Types of UI widgets/blocks that this Applet supports
    blockTypes: {
      'active_boards': {
        label: 'Active Boards',
        icon_src: 
        `<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 512 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M0 96C0 60.7 28.7 32 64 32H448c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96zm64 0v64h64V96H64zm384 0H192v64H448V96zM64 224v64h64V224H64zm384 0H192v64H448V224zM64 352v64h64V352H64zm384 0H192v64H448V352z"/></svg>`,
        view: "applet-view",
      },      
    },
    getAssetInfo: async (
      appletClient: AppAgentClient,
      roleName: RoleName,
      integrityZomeName: ZomeName,
      entryType: string,
      wal: WAL
    ): Promise<AssetInfo | undefined> => {
      if (entryType == "document") {
        const synClient = new SynClient(appletClient, roleName, ZOME_NAME);
        const synStore = new SynStore(synClient);
        const documentHash = wal.hrl[1]
        const docStore = new DocumentStore<BoardState, BoardEphemeralState> (synStore, documentHash)
        const workspaces = await toPromise(docStore.allWorkspaces)
        const workspace = new WorkspaceStore(docStore, Array.from(workspaces.keys())[0])
        const latestState = await toPromise(workspace.latestState)

        // if (wal.context) {
        //   const card = latestState.cards.find(c=>c.id === wal.context)
        //   if (card) {
        //     return {
        //       icon_src: CARD_ICON_SRC,
        //       name: `${latestState.name}: ${card.props.title}`,
        //     };    
        //   }
        // }
        return {
          icon_src: TABLE_ICON_SRC,
          name: latestState.name,
        };
      } else {
        throw new Error("unknown entry type:"+ entryType)
      }
    },
    search: async (
      appletClient: AppAgentClient,
      appletHash: AppletHash,
      weServices: WeServices,
      searchFilter: string
    ): Promise<Array<WAL>> => {
        const synClient = new SynClient(appletClient, ROLE_NAME, ZOME_NAME);
        const synStore = new SynStore(synClient);
        const boardHashes = asyncDerived(synStore.documentsByTag.get(BoardType.active),x=>Array.from(x.keys()))
            
        const boardData = new LazyHoloHashMap( documentHash => {
            const docStore = synStore.documents.get(documentHash)
    
            const workspace = pipe(docStore.allWorkspaces,
                workspaces => {
                    return new WorkspaceStore(docStore, Array.from(workspaces.keys())[0])
                }
            ) 
            const latestState = pipe(workspace, 
                w => w.latestState
                )
            return latestState
        })
    
        const allBoardsAsync = pipe(boardHashes,
            docHashes => sliceAndJoin(boardData, docHashes)
        )

        const allBoards = Array.from((await toPromise(allBoardsAsync)).entries())
        const dnaHash = await getMyDna(ROLE_NAME, appletClient)
        const searchText = searchFilter.toLowerCase()

        let hrls: Array<WAL> = allBoards
            .filter((r) => !!r)
            .filter((r) => {
                const state = r[1]
                return state.name.toLowerCase().includes(searchText)
            })
            .map((r) => ({ hrl: [dnaHash, r![0]], context: undefined }));
        // for (const r of allBoards.filter((r) => !!r)) {
        //   const state: BoardState = r[1]
        //   for (const card of state.cards) {
        //     if (card.props.title.toLowerCase().includes(searchText) || 
        //         card.props.description.toLowerCase().includes(searchText) ||
        //         Object.values(card.comments).find(c=>c.text.includes(searchText))
        //         ) {
        //         hrls.push({ hrl: [dnaHash, r![0]], context: card.id })
        //       }
        //   }
        // }
        return hrls
    },
};
  