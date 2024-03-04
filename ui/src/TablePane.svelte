<script lang="ts">
  import { getContext, onMount } from "svelte";
  import type { TablesStore } from "./store";
  import LabelSelector from "./LabelSelector.svelte";
  import type { v1 as uuidv1 } from "uuid";
  import {Board, type BoardProps, type Feed, type FeedItem, sortedFeedKeys, feedItems, deltaToFeedString, type Cell, Row, ColumnType, type CellId, type RowId } from "./board";
  import EditBoardDialog from "./EditBoardDialog.svelte";
  import CellEdit from "./CellEdit.svelte";
  import Avatar from "./Avatar.svelte";
  import { decodeHashFromBase64, type Timestamp } from "@holochain/client";
  import { cloneDeep, isEqual } from "lodash";
  import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
  import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
  import { hrlWithContextToB64, onVisible } from "./util";
  import SvgIcon from "./SvgIcon.svelte";
  import { exportBoard } from "./export";
  import { Marked, Renderer } from "@ts-stack/markdown";
  import hljs from 'highlight.js';
  import AttachmentsList from './AttachmentsList.svelte';
  import AttachmentsDialog from "./AttachmentsDialog.svelte"
  import type { HrlWithContext } from "@lightningrodlabs/we-applet";
  import RowDetailsDrawer from "./RowDetailsDrawer.svelte";

  class MyRenderer extends Renderer {
    override link(href: string, title : string, text: string) {
      return `<a href="${href}"${title? ` title="${title}"`:""} target="_blank">${text}</a>`
    }
  }

  Marked.setOptions
  ({
    renderer: new MyRenderer,
    highlight: (code, lang) =>  {
      if (lang)
        return hljs.highlight(lang, code).value
      return code
    },
    gfm: true,
    tables: true,
    breaks: false,
    pedantic: false,
    sanitize: true,
    smartLists: true,
    smartypants: false
  });

  $: filterOption = null;

  function setFilterOption(newOption) {
    filterOption = newOption;
  }

  const { getStore } :any = getContext("store");
  let store: TablesStore = getStore();

  export let activeBoard: Board
  export let standAlone = false

  $: uiProps = store.uiProps
  $: participants = activeBoard.participants()
  $: activeHashB64 = store.boardList.activeBoardHashB64;
  $: activeRow = store.boardList.activeRow;

  $: state = activeBoard.readableState()
  $: orderedRows = Object.entries($state.rows).map(([key,value])=>{return{id:key, cells:value}})
  let editCardDialog
  let editingCell: undefined|CellId
  function init(el){
    //if (el)
     // el.focus()
  }

  $: openDetails = (rowId) => {
    if (rowId) {
      if (rowDetailsDrawer) rowDetailsDrawer.open(rowId)
    } else {
      if (rowDetailsDrawer) rowDetailsDrawer.reset()
    }
    return rowId
  }


  $: rowDetailsId = openDetails($activeRow)

  let width = 300

  let prevHash = ""

  const clearEdit = () => {
    editingCell = undefined;
  };

  const cancelEdit = () => {
    clearEdit();
  }

  const rowDetails = (id: RowId) => {
    store.boardList.setActiveRow(id)
    //cardDetailsDialog.open(id)
  };
  const closeBoard = async () => {
    await store.closeActiveBoard(false);
  };

  const leaveBoard = async () => {
    await store.closeActiveBoard(true);
  };

  let editBoardDialog

  const close = ()=> {
    store.boardList.setActiveRow(undefined)
  }

  let attachmentsDialog : AttachmentsDialog

  const removeAttachment = (props: BoardProps, idx: number) => {
    let newProps = cloneDeep(props)
    newProps.attachments.splice(idx,1)
    activeBoard.requestChanges([{type: 'set-props', props : newProps }])
  }

  const copyHrlToClipboard = () => {
    const attachment: HrlWithContext = { hrl: [store.dnaHash, activeBoard.hash], context: "" }
    store.weClient?.hrlToClipboard(attachment)
  }
  let feedHidden = true
  let rowDetailsDrawer
</script>
<RowDetailsDrawer
  bind:this={rowDetailsDrawer}
/>

<div class="board" >
    <EditBoardDialog bind:this={editBoardDialog}></EditBoardDialog>
  <div class="top-bar">
    <div class="left-items">
      {#if standAlone}
        <h2>{$state.name}</h2>
      {:else}
        <sl-button  class="board-button close" on:click={closeBoard} title="Close">
          <SvgIcon icon=faClose size="16px"/>
        </sl-button>
        <sl-dropdown class="board-options board-menu" skidding=15 hoist>
          <sl-button slot="trigger"   class="board-button settings" caret>{$state.name}</sl-button>
          <sl-menu className="settings-menu">
            <sl-menu-item on:click={()=> editBoardDialog.open(cloneDeep(activeBoard.hash))} class="board-settings" >
                <SvgIcon icon="faCog"  style="background: transparent; opacity: .5; position: relative; top: -2px;" size="14px"/> <span>Settings</span>
            </sl-menu-item>
            <sl-menu-item on:click={() => exportBoard($state)} title="Export" class="board-export" >
              <SvgIcon icon="faFileExport"  style="background: transparent; opacity: .5; position: relative; top: -2px;" size="14px" /> <span>Export</span>
            </sl-menu-item>
            <sl-menu-item on:click={() => {
              store.archiveBoard(activeBoard.hash)
              }} title="Archive" class="board-archive" >
              <SvgIcon icon="faArchive" style="background: transparent; opacity: .5; position: relative; top: -2px;" size="14px" /> <span>Archive</span>
            </sl-menu-item>
            <sl-menu-item  on:click={leaveBoard} class="leave-board" >
                <SvgIcon icon="faArrowTurnDown" style="background: transparent; opacity: .5; position: relative; top: -2px;" size="12px" /> <span>Leave Table</span>
            </sl-menu-item>
          </sl-menu>
        </sl-dropdown>

        {#if store.weClient}
          <AttachmentsDialog activeBoard={activeBoard} bind:this={attachmentsDialog}
            on:save={(e)=>{
              if (e.detail.context === "board") {
                const props = cloneDeep(activeBoard.state().props)
                props.attachments = cloneDeep(e.detail.attachments)
                activeBoard.requestChanges([{type: 'set-props', props }])
              }
            }}
          ></AttachmentsDialog>
          {#if $state.boundTo.length>0}
            <div style="margin-left:10px;display:flex; align-items: center">
              <span style="margin-right: 5px;">Bound To:</span>
              <AttachmentsList allowDelete={false} attachments={$state.boundTo} />
            </div>
          {/if}
          <div style="margin-left:10px; margin-top:2px;display:flex">
            <button title="Add Board to Pocket" class="attachment-button" style="margin-right:10px" on:click={()=>copyHrlToClipboard()} >          
              <SvgIcon icon="addToPocket" size="20px"/>
            </button>
            <button title="Manage Board Attachments" class="attachment-button" style="margin-right:10px" on:click={()=>attachmentsDialog.open(activeBoard.state().props.attachments,"board")} >          
              <SvgIcon icon="link" size="20px"/>
            </button>
            {#if $state.props.attachments}
              <AttachmentsList attachments={$state.props.attachments}
                allowDelete={false}/>
            {/if}
          </div>
        {/if}
  
      {/if}
    </div>
    <div class="filter-by">
      <LabelSelector setOption={setFilterOption} option={filterOption} />
    </div>
    <div class="right-items">
      <svg
        on:click={()=>feedHidden = !feedHidden}
        style="margin-right:10px"
        xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 12h4l3 8l4 -16l3 8h4" /></svg>
      <div class="feed"
           class:hidden={feedHidden}
      >
      <div class="feed-header">
        <span><strong>Activity</strong> (latest 50)</span>
        <div class="details-button" title="Close" on:click={(e)=>{feedHidden = !feedHidden}}>
          <SvgIcon icon=faClose size="18px"/>
        </div>

      </div>
      <div class="feed-items">
        {#each feedItems($state.feed) as item}
          <div class="feed-item">
            <Avatar agentPubKey={decodeHashFromBase64(item.author)} showNickname={false} size={20} />
            <span>{deltaToFeedString($state,item.content)}
            </span>
            {store.timeAgo.format(item.timestamp)}
          </div>
        {/each}
        </div>
      </div>

      {#if $participants}
        <div class="participants">
          <div style="display:flex; flex-direction: row">
            <Avatar agentPubKey={store.myAgentPubKey} showNickname={false} size={30} />

            {#each Array.from($participants.entries()) as [agentPubKey, sessionData]}
            <div class:idle={Date.now()-sessionData.lastSeen >30000}>
              <Avatar agentPubKey={agentPubKey} showNickname={false} size={30} />
            </div>
            {/each}

          </div>
        </div>
      {/if}

    </div>
  </div>
  {#if $state}
    <div class="data-table">
      <div class="header-row">
        {#each $state.columnDefs as def}
          <div class="header-cell" style="width:{width}px">
            {def.name}
          </div>
        {/each}
      </div>
      {#each $state.rows as row, y}
        <div class="data-row">
          {#each $state.columnDefs as def, x}
          {@const cell = row.cells[def.id]}
            {#if editingCell && editingCell.rowId == row.id && editingCell.columnId == def.id}
              <div class="data-cell editing" style="width:{width}px">
                
                  <CellEdit
                    width={width}
                    type={def.type} 
                    cell={cell}
                    on:cancel={()=>editingCell=undefined}
                    on:save={(e)=>{
                      activeBoard.requestChanges([{ type: "set-cell", cellId: {rowId: row.id, columnId: def.id}, value:e.detail }]);
                      editingCell=undefined
                      }}
                  ></CellEdit>
              </div>
            {:else}
              <div class="data-cell" style="width:{width}px"
                on:click={()=>{
                  editingCell= {rowId:row.id, columnId:def.id}
                }}
              >
                {#if cell}
                  {#if def.type == ColumnType.WeaveAsset}
                    {#if cell.value}
                      <AttachmentsList attachments={[cell.value]} allowDelete={false}/>
                    {:else}
                      null
                    {/if}
                  {:else}
                    {cell.value}
                  {/if}
                {:else}
                null
                {/if}
               
              </div>
            {/if}
          {/each}
          <sl-button
            on:click={(e)=>{e.stopPropagation(); rowDetails(row.id)}} 
            circle size=small><SvgIcon icon="expand" size="20px"/></sl-button>
        </div>
      {/each}
      <sl-button size="small" circle style="margin-left:3px" on:click={async ()=>{
          const cells = {}
          //$state.columnDefs.forEach(def=>cells[def.id]={value: null, attachments:[]})
          const row = new Row(store.myAgentPubKeyB64, cells)
          await activeBoard.requestChanges([{ type: "add-row",  row}]);

        }} >          
          <SvgIcon icon=faPlus size=10/>
      </sl-button>
    </div>

  {/if}
  <div class="bottom-fade"></div>
</div>
<style>
  .data-table {
    border: 1px solid;
  }
  .header-row {
    display:flex;
    border-bottom: 1px solid;
  }
  .header-cell {
    font-weight: bold;
    color: black;
  }
  .data-row {
    display:flex;
    border-bottom: 1px dashed;
  }
  .data-cell, .header-cell {
    padding-right: 2px;
    padding-left: 2px;
    border-right: 1px dashed;
  }
  .data-cell {
  }

  .board {
    display: flex;
    flex-direction: column;
    background: transparent;
    border-radius: 0;
    min-height: 0;
    overflow-x: auto;
    width: 100%;
    position: relative;
    max-height: calc(100vh - 50px);
  }
  .top-bar {
    box-shadow: 0px 10px 15px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    background-color: #fff;
    padding-left: 10px;
    padding-right: 10px;
    border-radius: 0;
    position: sticky;
    width: 100%;
    top: 0;
    left: 0;
    z-index: 200;
    color: white
  }
  .left-items {
    display: flex;
    align-items: center;
  }
  .board-name {
    font-size: 24px;
    padding-left: 5px;
  }
  .right-items {
    display: flex;
    align-items: center;
  }

  sl-button.board-button::part(base) {
    background-color: transparent;
  }

  .board-button.close {
    margin-left: 0;
    margin-right: 5px;
  }

  .board-button.close::part(base) {
    font-size: 16px;
    line-height: 36px;
  }

  .right-items .board-button::part(base) {
    font-size: 24px;
  }
  
  .board-button {
    margin-left: 10px;
  }

  .board-button.settings {
    width: auto;
    margin-left: 0;
  }
  .board-options .board-settings {
    width: 100%;
    position: relative;
  }
  .board-options .board-settings span, .board-export span, .board-archive span, .board-options .leave-board span, .board-options .participants span {
    font-size: 16px;
    font-weight: bold;
  }

  .board-button.settings:hover {
    transform: scale(1.1);
  }

  .board-button.settings::part(base) {
    width: auto;
    font-size: 18px;
    font-weight: bold;
    color: rgba(86, 92, 108, 1.0);
  }

  .board-button.settings::part(label) {
    padding: 0 0 0 0;
    height: 36px;
    line-height: 36px;
  }

  .board-button.settings:hover {
    opacity: 1;
  }

  .board-button::part(base) {
    border: none;
    padding: 0;
    margin: 0;
  }
  
  .board-button {
    width: 30px;
    height: 30px;
    background: #FFFFFF;
    border: 1px solid rgba(35, 32, 74, 0.1);
    box-shadow: 0px 4px 4px rgba(66, 66, 66, 0.1);
    border-radius: 5px;
    padding: 5px 10px;
    display: flex;
    transform: scale(1);
    align-items: center;
    justify-content: center;
    transition: all .25s ease;
  }
  
  .board-button:hover {
    transform: scale(1.25);
  }

  .board-button:active {
    box-shadow: 0px 8px 10px rgba(53, 39, 211, 0.35);
    transform: scale(1.1);
  }

  sl-menu-item::part(checked-icon) {
    display: none;
  }

  sl-menu-item::part(base) {
    padding-left: 8px;
  }

  .card-edit {
    position: relative;
    z-index: 1;
  }

  .card-edit .board-button:hover {

  }
  .card-edit .board-button:active {
    padding: 5px 10px;
    box-shadow: 0px 8px 10px rgba(53, 39, 211, 0.35);
  }

  .filter-by {
    display: flex;
    align-items: center;
    margin-right: 8px;
    height: 47px;
    padding-right: 10px;
  }

  .bottom-fade {
    position: fixed;
    bottom: 0;
    z-index: 100;
    width: 100%;
    height: 20px;
    bottom: 10px;
    background: linear-gradient(180deg, rgba(189, 209, 230, 0) 0%, rgba(102, 138, 174, 0.81) 100%);
    opacity: 0.4;
  }
 
  .columns {
    display: flex;
    flex: 0 1 auto;
    max-height: 100%;
    background: transparent;
    min-height: 0;
    padding: 0 15px 0 15px;
    position: relative;
    z-index: 1;
  }

  .column-item {
    padding: 10px 10px 0px 10px;
    display: flex;
    align-items: center;
    flex: 0 1 auto;
  }

  .column-title, .add-column {
    font-weight: bold;
    font-size: 16px;
    padding: 10px;
    border-radius: 0 0 5px 5px;
    position: sticky;
    z-index: 0;
    top: 0;
    background-color: #fff;
    box-shadow: 0px 4px 15px rgba(35, 32, 74, 0.15);
    z-index: 150;
    transition: all .25s ease;
  }
  .add-column {
    opacity: .7;
    transition: all .25s ease;
  }

  .editing-column-name.add-column {
    display: flex;
    flex-direction: row;
  }

  .new-column-button {
    width: 40px;
    transform: scale(1);
    transition: all .25s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    top: -2px;
  }

  .new-column-button:hover {
    transform: scale(1.25);
    cursor: pointer;
  }
  
  .new-column-button:active {
    transform: sclae(1.1);
    box-shadow: 0px 8px 10px rgba(53, 39, 211, 0.35);
  }

  .new-column-button::part(base) {
    border: none;
  }

  .new-column-icon {
    position: relative;
    top: 3px;
  }
  .column-title:hover, .add-column:hover {
    box-shadow: 0px 4px 15px rgba(35, 32, 74, 0.3);
    padding: 15px;
    margin: 0 -5px;
    opacity: 1;
    cursor: pointer;
  }

  .column-name-input {
    width: 230px;
  }

  .column-title:hover {
    cursor: pointer;
    margin: 0 -5px -10px -5px;
  }

  .column-footer {
    border-top: 1px solid #999;
    padding: 0 5px;
    min-height: 38px;
  }
  .column-wrap {
    display: flex;
    flex-direction: column;
  }
  .column {
    margin-right: 10px;
    display: flex;
    flex-direction: column;
    width: 300px;
    margin-left: 10px;
    border-radius: 3px;
    min-width: 130px;
    min-height: 0;
    max-height: calc(100vh - 100px);
    overflow: visible;
  }
  .first-column {
    margin-left: 0px !important;
  }
  .cards {
    display: flex;
    flex-direction: column;
    overflow-y: scroll;
    width: calc(100% + 8px);
    height: calc(100vh - 150px);
    margin-top: 0;
    padding-top: 10px;
    padding-bottom: 20px;
  }
  .cards::-webkit-scrollbar {
    width: 5px;
    background-color: transparent;
  }

  .cards::-webkit-scrollbar-thumb {
      height: 5px;
      border-radius: 5px;
      background: rgba(20,60,119,.3);
      opacity: 1;
  }

  .board::-webkit-scrollbar {
    height: 10px;
    background-color: transparent;
  }

  .board::-webkit-scrollbar-thumb {
    border-radius: 0 0 0 0;
    background: rgba(20,60,119,.7);
    /* background: linear-gradient(180deg, rgba(20, 60, 119, 0) 0%, rgba(20,60,119,.6) 100%); */
  }

  .glowing {
    outline: none;
    border-color: #9ecaed;
    box-shadow: 0 0 10px #9ecaed !important;
  }
  .tilted {
    transform: rotate(3deg);
    box-shadow: 4px 4px 10px rgba(0, 0, 0, 0.5) !important;
  }

  .card, .add-card {
    background-color: white;
    margin: 0px 10px 10px 10px;
    box-shadow: 0px 4px 4px rgba(35, 32, 74, 0.15);
    font-size: 12px;
    line-height: 16px;
    color: #23204A;
    border-radius: 5px;
    display:flex;
    flex-direction:column;
    padding: 10px;
    transition: all .25s ease;
    height: 0;
    height: auto;
  }

  .card:hover .board-button {
    opacity: 1;
  }

  .card:hover, .add-card:hover {
    cursor: pointer;
    box-shadow: 0px 8px 10px rgba(35, 32, 74, 0.25);
    padding: 20px;
    margin: -5px 0px -5px 0px;
    position: relative;
    z-index: 100;

    /* uncomment to see this example of card growing dramatically */
    /* height: calc(100vh - 125px);
    max-height: calc(100vh - 125px); */
  }

  .card:active, .add-card:active {
    box-shadow: 0px 8px 10px rgba(53, 39, 211, 0.35);
    padding: 15px;
    margin: 0px 5px 0px 5px;
  }

  .add-card {
    display: flex;
    flex-direction: row;
    font-size: 14px;
    opacity: .7;
  }

  .add-card:hover {
    opacity: 1;
  }

  .add-icon {
    font-size: 24px;
    opacity: .6;
    font-weight: bold;
    margin-right: 5px;
  }

  .card-edit .board-button {
    padding: 10px 15px;
    opacity: 0;
    transition: all .25s ease;
  }

  .card:hover .card-edit .board-button {
    opacity: 1;
  }
  .card-content {
    padding: 0 5px;
  }

  .card-title {
    font-size: 16px;
    font-weight: bold;
  }

  .card-description {
    font-size: 14px;
    opacity: .8;
    line-height: 18px;
    padding-top: 3px;
    -webkit-line-clamp: 3;
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    position: relative;
    z-index: 0;
  }

  .contributors {
    padding-top: 15px;
    padding-left: 8px;
    padding-right: 10px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  .unread-comment {
    background-color: red;
    width:8px;
    height: 8px;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;

  }
  .comments-checklist {
    display: flex;
    position: relative;
    top: 3px;
  }
  
  .comment-count {
    margin-right: 10px;
  }
  .attachments-count {
    margin-left: 10px;
  }

  .labels {
    display: block;
    padding-bottom: 10px;
  }
  
  .labels div {
    display: inline-flex;
    width: 30px;
    height: 30px;
    align-items: center;
    justify-content: center;
    border-radius: 5px;
    margin-right: 10px;
    border: 1px solid rgba(235, 235, 238, 1.0);
    background-color: rgba(255,255,255,.8);
  }

  :global(.attachment-button) {
    width: 30px;
    height: 30px;
    padding: 4px;
    border-radius: 50%;
    border: 1px solid rgba(235, 235, 238, 1.0);
    background-color: rgba(255,255,255,.8);    
  }
  :global(.attachment-button:hover) {
    transform: scale(1.25);
  }
  .hidden {
    display: none !important;
  }
  .feed {
    border: solid 2px black;
    border-radius: 5px;
    position: absolute;
    top: 30px;
    right: 10px;
    z-index: 10;
    background-color: rgba(255, 255, 255, 0.9);
    display:flex;
    flex-direction: column;
  }
  .feed-header {
    margin: 5px;
    display:flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  .feed-items {
    padding: 10px;
    display:flex;
    flex-direction: column;
    max-height: 88vh;
    overflow: auto;
    border-top: solid 1px gray;
    padding-top: 5px;
  }
  .feed-item {
    padding: 4px;
    border-radius: 5px;
    margin-bottom: 5px;
    border: solid 1px blue;
    background-color: rgba( 0, 0, 255, 0.1);
  }
  .idle {
    opacity: 0.5;
  }

</style>
