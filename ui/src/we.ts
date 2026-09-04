import { DocumentStore, SynClient, SynStore, WorkspaceStore } from '@holochain-syn/core';
import type { BoardEphemeralState, BoardState } from './board';
import type { MirrorEphemeralState, MirrorState } from './mirror';
import { asyncDerived, pipe, sliceAndJoin, toPromise } from '@holochain-open-dev/stores';
import { BoardType } from './boardList';
import { MirrorType } from './mirrorList';
import type { AppletHash, AppletServices, AssetInfo, WAL, WeaveServices, RecordInfo } from '@theweave/api';
import { getMyDna } from './util';
import { LazyHoloHashMap, type AppClient } from '@holochain/client';

const ROLE_NAME = "tables"
const ZOME_NAME = "syn"

const TABLE_ICON_SRC = `data:image/svg+xml;utf8,
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm240-240H200v160h240v-160Zm80 0v160h240v-160H520Zm-80-80v-160H200v160h240Zm80 0h240v-160H520v160ZM200-680h560v-80H200v80Z"/></svg>
`
const VIEW_ICON_SRC = `data:image/svg+xml;utf8,
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M80-360v-240q0-33 23.5-56.5T160-680q33 0 56.5 23.5T240-600v240q0 33-23.5 56.5T160-280q-33 0-56.5-23.5T80-360Zm280 160q-33 0-56.5-23.5T280-280v-400q0-33 23.5-56.5T360-760h240q33 0 56.5 23.5T680-680v400q0 33-23.5 56.5T600-200H360Zm360-160v-240q0-33 23.5-56.5T800-680q33 0 56.5 23.5T880-600v240q0 33-23.5 56.5T800-280q-33 0-56.5-23.5T720-360Zm-360 80h240v-400H360v400Zm120-200Z"/></svg>
`
const CARD_ICON_SRC = `data:image/svg+xml;utf8,
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M0 96C0 60.7 28.7 32 64 32H448c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96zm64 0v64h64V96H64zm384 0H192v64H448V96zM64 224v64h64V224H64zm384 0H192v64H448V224zM64 352v64h64V352H64zm384 0H192v64H448V352z"/></svg>
`

export const appletServices: AppletServices = {
    // Types of attachment that this Applet offers for other Applets to be created
    creatables: {
      'table': {
        label: "Table",
        icon_src: TABLE_ICON_SRC,
      }
    },

    // NOTE (Holochain 0.7 / Moss 0.16 upgrade): `blockTypes` and the 'block'
    // AppletView were removed from @theweave/api. AppletServices is now
    // { creatables, getAssetInfo, search } and AppletView is
    // 'main' | 'asset' | 'creatable'. The 'active_boards' block declared here has
    // no 0.7 equivalent, so it is gone. See App.svelte for the matching removal.
    getAssetInfo: async (
      appletClient: AppClient,
      wal: WAL,
      recordInfo: RecordInfo,
    ): Promise<AssetInfo | undefined> => {
      let entryType = recordInfo.entryType;
      let roleName = recordInfo.roleName;
      if (entryType == "document") {
        const synClient = new SynClient(appletClient, roleName, ZOME_NAME);
        const synStore = new SynStore(synClient, true);
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
        let name = latestState.name
        let parsedContext;
        let assetType;
        try {
          parsedContext = wal.context
          assetType = parsedContext.assetType
          if (assetType) {
            name = name + ": " + assetType
          }
          if (parsedContext.cellId) {
            let cell = latestState.rows.find(r=>r.id === parsedContext.cellId.rowId).cells[parsedContext.cellId.columnId]
            name = name + " = " + cell.value
          }
        } catch {
          // do nothing
        }
        return {
          icon_src: assetType === "Table" ? TABLE_ICON_SRC : assetType === "View" ? VIEW_ICON_SRC : CARD_ICON_SRC,
          name: name,
        };
      } else {
        throw new Error("unknown entry type:"+ entryType)
      }
    },
    search: async (
      appletClient: AppClient,
      appletHash: AppletHash,
      weServices: WeaveServices,
      searchFilter: string
    ): Promise<Array<WAL>> => {
        const synClient = new SynClient(appletClient, ROLE_NAME, ZOME_NAME);
        const synStore = new SynStore(synClient, true);
        const boardHashes = asyncDerived(synStore.documentsByTag.get(BoardType.active),x=>Array.from(x.keys()))
      const viewHashes = asyncDerived(synStore.documentsByTag.get(MirrorType.active),x=>Array.from(x.keys()))
            
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

            const viewData = new LazyHoloHashMap( documentHash => {
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
            const allViewsAsync = pipe(viewHashes,
              docHashes => sliceAndJoin(viewData, docHashes)
            )

        const allBoards = Array.from((await toPromise(allBoardsAsync)).entries())
            const allViews = Array.from((await toPromise(allViewsAsync)).entries())
        const dnaHash = await getMyDna(ROLE_NAME, appletClient)
        const searchText = searchFilter.toLowerCase()

            let hrls: Array<WAL> = allBoards
            .filter((r) => !!r)
            .filter((r) => {
                const state = r[1] as BoardState
                return state.name.toLowerCase().includes(searchText)
            })
              .map((r) => ({ hrl: [dnaHash, r![0]], context: { assetType: "Table" } }));

            hrls = hrls.concat(allViews
              .filter((r) => !!r)
              .filter((r) => {
                const state = r[1] as MirrorState
                return state.name.toLowerCase().includes(searchText)
              })
              .map((r) => ({ hrl: [dnaHash, r![0]], context: { assetType: "View" } })));
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
  