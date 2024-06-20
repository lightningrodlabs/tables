<script lang="ts">
    import { getContext } from "svelte";
    import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
    import SvgIcon from "./SvgIcon.svelte";
    import type { TablesStore } from "./store";
    import {asyncDerived, toPromise} from '@holochain-open-dev/stores'
    import { BoardType } from "./boardList";
    import type { Board, BoardEphemeralState, BoardState } from "./board";
    import { ColumnDef, Row, SumType } from "./board";
    import { deserializeExport, exportBoards } from "./export";
    import { DocumentStore, WorkspaceStore } from "@holochain-syn/core";
    import { encodeHashToBase64 } from "@holochain/client";
    import { v1 as uuidv1 } from "uuid";
    import Papa from "papaparse";
    
    const { getStore } :any = getContext('store');
    
    const store:TablesStore = getStore();
    
    let dialog
    export const open = ()=>{dialog.show()}

    let fileinput;
	const onFileSelected = (e)=>{
        let file = e.target.files[0];
        let reader = new FileReader();

        reader.addEventListener("load", async () => {
            const importedBoardStates = deserializeExport(reader.result as string)
            if ( importedBoardStates.length > 0) {
                const boards:Array<Board> = []
                for (const b of importedBoardStates) {
                    console.log("importing", b.name)
                    try {
                        boards.push(await store.boardList.makeBoard(b))
                    } catch(e) {
                        console.log("error importing", b.name, e)
                    }
                }
                if (importedBoardStates.length == 1) {
                    store.setUIprops({showMenu:false})
                    boards[0].join()
                    store.setActiveBoard(boards[0].hash)
                }
            }
            importing = false
        }, false);
        importing = true
        reader.readAsText(file);
    };
    let csvfileinput;
    const onCSVSelected = (e)=>{
        let file = e.target.files[0];
        let reader = new FileReader();
        reader.addEventListener("load", async () => {
            const csv = Papa.parse(reader.result as string)

            let boardState = {
                status: "complete",
                name: "Imported Board",
                rows: [],
                queries: [],
                summaryRows: [],
                labelDefs: [],
                columnDefs: csv.data[0].map(cell=>{return {id: uuidv1(), name: cell, type: 0}}),
                boundTo: [],
            }

            for (let i = 1; i < csv.data.length; i++) {
                const row = new Row(store.myAgentPubKeyB64, {})

                for (let j = 0; j < csv.data[i].length; j++) {
                    let cellData = {attachments:[], value: csv.data[i][j]};
                    row.cells[boardState.columnDefs[j].id] = cellData;
                }

                boardState.rows.push(row)
            }

            let newBoard = await store.boardList.makeBoard(boardState)
            store.setActiveBoard(newBoard.hash)
            
            importing = false
        }, false);
        importing = true
        reader.readAsText(file);
    };
    const createBoardFrom = async (oldBoard: BoardState) => {
        const board = await store.boardList.cloneBoard(oldBoard)
        store.setUIprops({showMenu:false})
        store.setActiveBoard(board.hash)
    }
    const exportAllBoards = async () => {
        const boardStates = []
        exporting = true

        const hashes = await toPromise(asyncDerived(store.synStore.documentsByTag.get(BoardType.active),x=>Array.from(x.keys())))
        const docs = hashes.map(hash=>new DocumentStore<BoardState, BoardEphemeralState>(store.synStore, hash))
        for (const docStore of docs) {
            try {
                const workspaces = await toPromise(docStore.allWorkspaces)
                const workspaceStore = new WorkspaceStore(docStore, Array.from(workspaces.keys())[0])
                boardStates.push(await toPromise(workspaceStore.latestSnapshot))
            } catch(e) {
                console.log("Error getting snapshot for ", encodeHashToBase64(docStore.documentHash), e)
            }
        }
        exportBoards(boardStates)
        exporting = false
    }
    let importing = false
    let exporting = false

    $: allBoards = store.boardList.allBoards

</script>


<sl-dialog label="Datatub: UI v0.10-dev.0 for DNA v0.10.0-dev.0" bind:this={dialog} width={600} >
    <div class="about">
        <p>Datatub is a demonstration Holochain app built by Lightning Rod Labs.</p>
        <p> <b>Developers:</b>
            Check out this hApp's source-code <a href="https://github.com/lightningrodlabs/tables">in our github repo</a>.
            This project's real-time syncronization is powered by <a href="https://github.com/holochain/syn">Syn</a>, 
            a library that makes it really easy to build this kind of real-time collaboaration into Holochain apps.
        </p>
    <p class="small">Copyright © 2023,2024 Holochain Foundation &amp; Lightning Rod Labs.  This software is distributed under the MIT License</p>
    {#if importing}
        <div class="export-import" title="Import Boards">
            <div class="spinning" style="margin:auto"><SvgIcon icon=faSpinner color="#fff"></SvgIcon></div>
        </div>
    {:else}
        <div class="export-import" on:click={()=>{fileinput.click();}} title="Import Boards">
            <SvgIcon color="#fff" icon=faFileImport size=20px style="margin-left: 15px;"/><span>Import from json</span>
        </div>
        <div class="export-import" on:click={()=>{csvfileinput.click();}} title="Import Boards">
            <SvgIcon color="#fff" icon=faFileImport size=20px style="margin-left: 15px;"/><span>Import from csv</span>
        </div>
    {/if}
    {#if exporting}
        <div class="export-import" title="Import Boards">
            <div class="spinning" style="margin:auto"><SvgIcon icon=faSpinner  color="#fff"></SvgIcon></div>
        </div>
    {:else}
        <div class="export-import" on:click={()=>{exportAllBoards()}} title="Export All Boards"><SvgIcon color="#fff" icon=faFileExport size=20px style="margin-left: 15px;"/><span>Export All</span></div>
    {/if}


    {#if $allBoards.status == "pending"}
        <div class="spinning" style="display:inline-block;"> <SvgIcon icon=faSpinner  color="black"></SvgIcon></div>
    {:else if $allBoards.status == "complete"}
        <sl-dropdown skidding=15>
            <sl-button slot="trigger" caret><SvgIcon icon=faClone size=20px style="margin-right: 10px;"/><span>New table From </span></sl-button>
            <sl-menu>
                {#each Array.from($allBoards.value.entries()) as [key,board]}
                    <sl-menu-item on:click={()=>{
                        createBoardFrom(board.latestState)
                    }} >
                        {board.latestState.name}
                    </sl-menu-item>
                {/each}
            </sl-menu>
        </sl-dropdown>
    {:else if $allBoards.status == "error"}
        Error: {$allBoards.error}
    {/if}

    <input style="display:none" type="file" accept=".json" on:change={(e)=>onFileSelected(e)} bind:this={fileinput} >
    <input style="display:none" type="file" accept=".csv" on:change={(e)=>onCSVSelected(e)} bind:this={csvfileinput} >
    </div>
</sl-dialog>

<style>
    .about p {

        margin-bottom:10px;
     }
     .small {
        font-size: 80%;
     }
     .export-import {
        box-sizing: border-box;
        position: relative;
        width: 100%;
        height: 50px;
        background: #243076;
        border: 1px solid #4A559D;
        margin-top: 5px;
        color: #fff;
        display: flex;
        align-items: center;
        border-radius: 5px;
        cursor: pointer;
        margin-bottom: 6px;;
    }

    .export-import span {
        color: #fff;
        display: block;
        padding: 0 15px;
    }
</style>
  