<script lang="ts">
  import { getContext, onMount } from "svelte";
  import type { TablesStore } from "./store";
  import LabelSelector from "./LabelSelector.svelte";
  import { v1 as uuidv1 } from "uuid";
  import {LabelDef, ColumnDef, Board, type BoardProps, type Feed, type FeedItem, sortedFeedKeys, feedItems, deltaToFeedString, type Cell, Row, ColumnType, type CellId, type RowId, SumType } from "./board";
  import EditBoardDialog from "./EditBoardDialog.svelte";
  import AddColumnModal from "./AddColumnModal.svelte";
  import EditHeader from "./EditHeader.svelte";
  import CellEdit from "./CellEdit.svelte";
  import Avatar from "./Avatar.svelte";
  import SummaryRow from "./SummaryRow.svelte";
  import { decodeHashFromBase64, type Timestamp } from "@holochain/client";
  import { cloneDeep, isEqual } from "lodash";
  import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
  import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
  import { onVisible } from "./util";
  import SvgIcon from "./SvgIcon.svelte";
  import { exportBoard } from "./export";
  import { Marked, Renderer } from "@ts-stack/markdown";
  import hljs from 'highlight.js';
  import AttachmentsList from './AttachmentsList.svelte';
  import AttachmentsDialog from "./AttachmentsDialog.svelte"
  import type { WAL } from '@theweave/api';
  import DragDropList, { VerticalDropZone, reorder, type DropEvent, HorizontalDropZone } from 'svelte-dnd-list';
  import RowDetailsDrawer from "./RowDetailsDrawer.svelte";
  import CellDisplay from "./CellDisplay.svelte";
  import Queries from './Queries.svelte'
  import { scale } from 'svelte/transition';

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
  $: showAddColumnModal = false;
  $: showEditHeader = false;
  $: editHeaderIndex = null;
  $: editHeaderElement = null;
  $: addUniqueSummaryFromColumn = null;

  function setFilterOption(newOption) {
    filterOption = newOption;
  }

  function injectColumnNames(query) {
    let newQuery = query;
    $state.columnDefs.forEach((col) => {
      newQuery = newQuery.replace(new RegExp(col.id, 'g'), col.name);
    })
    return newQuery;
  }

  const { getStore } :any = getContext("store");
  let store: TablesStore = getStore();

  export let activeBoard: Board
  export let standAlone = false

  $: uiProps = store.uiProps
  $: participants = activeBoard.participants()
  $: activeHashB64 = activeBoard.hashB64
  $: activeRow = store.boardList.activeRow;

  $: state = activeBoard.readableState()
  $: orderedRows = Object.entries($state.rows).map(([key,value])=>{return{id:key, cells:value}})
  let editCardDialog
  let showQueryBuilder = true;
  let editingCell: undefined|CellId
  let queriedData = {};
  let newQueryBool = false;
  $: queriedData;
  let newSummaryRowModal = false;
  $: newSummaryRowModal;

  $: openDetails = (rowId) => {
    if (rowId) {
      if (rowDetailsDrawer) rowDetailsDrawer.open(rowId)
    } else {
      if (rowDetailsDrawer) rowDetailsDrawer.reset()
    }
    return rowId
  }

  $: rowDetailsId = openDetails($activeRow)

  let width = 200

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

  const walToPocket = () => {
    const attachment: WAL = { hrl: [store.dnaHash, activeBoard.hash], context: {assetType: "Table"} }
    store.weClient?.assets.assetToPocket(attachment)
  }

  const rowToPocket = (rowId: RowId) => {
    const attachment: WAL = { hrl: [store.dnaHash, activeBoard.hash], context: {assetType: "Row", rowId} }
    store.weClient?.assets.assetToPocket(attachment)
  }

  const columnToPocket = (columnId: string) => {
    const attachment: WAL = { hrl: [store.dnaHash, activeBoard.hash], context: {assetType: "Column", columnId} }
    store.weClient?.assets.assetToPocket(attachment)
  }

  const onDropColumnDefs = ({ detail: { from, to } }: CustomEvent<DropEvent>) => {
    if (!to || from === to || from.dropZoneID !== "columnDefs") {
      return;
    }

    let columnDefs = cloneDeep($state.columnDefs)
    columnDefs = reorder(columnDefs, from.index, to.index)
    activeBoard.requestChanges([{ type: "set-column-defs",  "columnDefs": columnDefs}]);
  }

  let feedHidden = true
  let rowDetailsDrawer

  function checkKey(e: any) {
    if (e.key === "Tab" && !e.shiftKey) {
      // if cell editing, save and move to next cell in the row
      if (editingCell) {
        let rowIndex = $state.rows.findIndex(row=>row.id == editingCell.rowId)
        let index = $state.columnDefs.findIndex(def=>def.id == editingCell.columnId)
        
        const columnCellValues = Object.values($state.rows.map(row=>row.cells[editingCell.columnId])).map(cell=>cell?.value)
        const shouldBeUnique = $state.columnDefs[index]?.unique
        const valueIsUnique = !shouldBeUnique || columnCellValues.indexOf(e.target.value) == -1 || e.target.value == null

        if (!valueIsUnique) {
          editingCell = undefined
          return
        }

        activeBoard.requestChanges([{ type: "set-cell", cellId: editingCell, value: e.target.value }]);
        if (index < $state.columnDefs.length-1) {
          editingCell = {rowId: editingCell.rowId, columnId: $state.columnDefs[index+1].id}
        }
      }
    }

    // enter saves and goes to next row same column
    if (e.key === "Enter" && !e.shiftKey) {
      if (editingCell && $state.rows && $state.columnDefs) {
        let rowIndex = $state.rows.findIndex(row=>row.id == editingCell.rowId)
        let index = $state.columnDefs.findIndex(def=>def.id == editingCell.columnId)
        
        const columnCellValues = Object.values($state.rows.map(row=>row.cells[editingCell.columnId])).map(cell=>cell?.value)
        const shouldBeUnique = $state.columnDefs[index]?.unique
        const valueIsUnique = !shouldBeUnique || columnCellValues.indexOf(e.target.value) == -1 || e.target.value == null

        if (!valueIsUnique) {
          editingCell = undefined
          return
        }

        activeBoard.requestChanges([{ type: "set-cell", cellId: editingCell, value: e.target.value }]);

        if (rowIndex == $state.rows.length-1) {
          activeBoard.requestChanges([{ type: "add-row", row: new Row(store.myAgentPubKeyB64, {}) }]);
          queriedData[activeHashB64] = activeBoard.state().rows.map(row=>row.id)
        }

        if (rowIndex < $state.rows.length-1) {
          editingCell = {rowId: $state.rows[rowIndex+1].id, columnId: $state.columnDefs[index].id}
        }
      }
    }

    // escape saves and closes
    if (e.key === "Escape" && !e.shiftKey) {
      e.preventDefault();
      if (editingCell) {
        activeBoard.requestChanges([{ type: "set-cell", cellId: editingCell, value: e.target.value }]);
        editingCell = undefined;
      }
    }
  }

  onMount(() => {
    window.addEventListener("keydown", checkKey);
    if (activeBoard) {
      queriedData[activeHashB64] = activeBoard.state().rows.map(row=>row.id)
    }
    // TODO: if mouse click outside cell, save cell
    window.addEventListener("click", (e) => {
      if (!e.target.classList.contains('data-cell')) {
        const editingCellInput = document.querySelector('.edit-cell-input')
        if (!editingCellInput) {return;}
        const editingCellValue = editingCellInput.value;
        if (editingCell && !e.target.classList.contains('data-cell') && !e.target.classList.contains('edit-cell-input')) {
          let index = $state.columnDefs.findIndex(def=>def.id == editingCell.columnId)
          const columnCellValues = Object.values($state.rows.map(row=>row.cells[editingCell.columnId])).map(cell=>cell?.value)
          const shouldBeUnique = $state.columnDefs[index]?.unique
          const valueIsUnique = !shouldBeUnique || columnCellValues.indexOf(editingCellValue) == -1 || editingCellValue == null
          if (!valueIsUnique) {
            editingCell = undefined
            return
          }

          activeBoard.requestChanges([{ type: "set-cell", cellId: editingCell, value: editingCellValue }]);
          editingCell = undefined;
        }
      }
    });
  });
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
        <sl-button  class="board-button close" on:click={leaveBoard} title="Close">
          <SvgIcon icon=faClose size="16px"/>
        </sl-button>
        <sl-dropdown class="board-options board-menu" skidding=15 hoist>
          <!-- <sl-button slot="trigger"   class="board-button settings">{$state.name}</sl-button> -->
          <sl-button slot="trigger"   class="board-button settings" caret>{$state.name}</sl-button>
          <sl-menu class="settings-menu">
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
            <button title="Add Board to Pocket" class="attachment-button" style="margin-right:10px" on:click={()=>walToPocket()} >          
              <SvgIcon icon="addToPocket" size="20px"/>
            </button>
            <button title="Manage Board Attachments" class="attachment-button" style="margin-right:10px" on:click={()=>attachmentsDialog.open(activeBoard.state().props.attachments,"board")} >          
              <SvgIcon icon="link" size="20px"/>
            </button>
            {#if $state.props.attachments}
              <div style="margin-top: 2.5px">
                <AttachmentsList attachments={$state.props.attachments}
                allowDelete={false}/>
              </div>
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

  {#if showQueryBuilder && $state.queries}
    <Queries {activeBoard} {state} bind:newQueryBool bind:queriedData />
  {/if}

  {#if false}
    <!-- <DataView state={$state} /> -->
  {:else}
    <div class="data-table">
      <div class="header-row">
        <div class="header-actions-cell">
          <div class="header-action-placeholder">
          </div>
          </div>
          
      <DragDropList
        id="columnDefs"
        itemSize={width}
        type={HorizontalDropZone}
        itemCount={$state.columnDefs.length}
        on:drop={onDropColumnDefs}
        let:index
        let:drag
      >
        {@const isDragging = drag?.sourceIndex === index}
        <div 
          class="header-cell"
          title={$state.columnDefs[index].name}
        >
          <div class="column-title">
            {$state.columnDefs[index].name}
            {#if $state.columnDefs[index].unique}
              *
            {/if}
          </div>

          <button class="pocket-button" title="Add Column to Pocket" on:click={(e)=>{
            e.stopPropagation();
            columnToPocket($state.columnDefs[index].id)
          }} >
            <SvgIcon icon="addToPocket" size="20px"/>
          </button>
          
          <div class="header-caret"
            on:mousedown={(e)=>{
              e.stopPropagation();
              editHeaderElement = e.currentTarget.closest('.header-cell');
              editHeaderIndex = index;
              showEditHeader = true;
            }}
          >
            &#9660;
        </div>

        </div>
        {#if isDragging}
          {#each $state.rows as row}
            <div class="data-cell" style="width:{width}px; background-color: #f0f0f0; border-right: 1px solid #462700; border-bottom: 1px solid #462700;">
              {row.cells[$state.columnDefs[index].id]?.value || "null"}
            </div>
          {/each}
        {/if}
        
      </DragDropList>
      <div class="add-column-header" on:click={()=>{
          editHeaderIndex = $state.columnDefs.length - 1;
          showEditHeader = true;
          editHeaderElement = null;
        }}>
        <div class="add-column-button" id="add-column-button">
          <SvgIcon icon=faPlus size=10 style="height:23px;"/>
        </div>
      </div>
      {#if showAddColumnModal}
        <AddColumnModal bind:showAddColumnModal activeBoard={activeBoard} />
      {/if}
    </div>

    {#if showEditHeader}
      <EditHeader bind:showEditHeader {activeBoard} {editHeaderIndex} headerElement={editHeaderElement}></EditHeader>
    {/if}

      {#each $state.rows as row, y}
        {#if queriedData[activeHashB64] && queriedData[activeHashB64].indexOf(row.id) == -1 ? null : true}
          <div class="data-row">
            <div class="row-actions-cell">
              <div class="row-action-wrapper">
                <button class="pocket-button" title="Add Row to Pocket" on:click={()=>{
                  rowToPocket(row.id)
                }} >          
                  <SvgIcon icon="addToPocket" size="20px"/>
                </button>
              </div>
              <div 
                class="trash-button" 
                title="Delete Row"
                on:click={(e)=>{
                  e.stopPropagation(); 
                  let id = row.id
                  activeBoard.requestChanges([{ type: "delete-row", id }]);
                }}
              >
                <SvgIcon icon="faTrash" size="10px"/>
              </div>
              <div 
                class="expand-button" 
                title="Row Details"
                on:click={(e)=>{e.stopPropagation(); rowDetails(row.id)}}>
                <SvgIcon icon="expand" size="14px"/>
              </div>
            </div>
            {#each $state.columnDefs as def, x}
            {@const cell = row.cells[def.id]}
            <!-- column values -->
            {@const cells = $state.rows.map(row=>row.cells[def.id])}
            {#if editingCell && editingCell.rowId == row.id && editingCell.columnId == def.id}
                <div class="data-cell editing" style="width:{width}px">
                    <CellEdit
                      unique={def.unique}
                      columnDef={def}
                      boardHash={activeBoard.hash}
                      cellId={{rowId: row.id, columnId: def.id}}
                      width={width-34}
                      type={def.type}
                      cell={cell}
                      allColumnCells={cells}
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
                    const previousCell = document.querySelector('.edit-cell-input')
                    if (previousCell) {
                      activeBoard.requestChanges([{ type: "set-cell", cellId: editingCell, value: previousCell.value }]);
                    }
                    editingCell= {rowId:row.id, columnId:def.id}
                  }}
                >
                  {#if cell}
                    <CellDisplay {cell} {def} />                  
                  {:else}
                   
                  {/if}
                
                </div>
              {/if}
            {/each}
            
          </div>
        {/if}
      {/each}
      
      <div 
        on:mousedown={async ()=>{
          const cells = {}
          const row = new Row(store.myAgentPubKeyB64, cells)
          await activeBoard.requestChanges([{ type: "add-row",  row}]);
          queriedData[activeHashB64] = activeBoard.state().rows.map(row=>row.id)
        }}
        class="add-row-wrapper" 
        style="width: {200 * $state.columnDefs.length + 1}px">
        Add Row&nbsp;
        <div class="add-column-button">
          <SvgIcon icon=faPlus size=10 style="height: 23px;"/>
        </div>
      </div>
      <div class="summary-row">
        <div class="summary-row-label summary-row-label-main">
          No filter
        </div>
        {#each $state.columnDefs as def, x}
          <SummaryRow activeBoard={activeBoard} def={def} width={width} sumType={def.sumType} />
        {/each}
      </div>
      {#if $state.summaryRows && $state.summaryRows.length}
      {#each $state.summaryRows as summaryRow}
      <div class="summary-row">
        <button
          class="remove-summary-row"
          title="Remove Summary Row"
          on:click={()=>{activeBoard.requestChanges([{ type: "remove-summary-row", id: summaryRow.id}]);}}
        >-</button>
          <div 
            class="summary-row-label"
            title={summaryRow.queryLabel + " (" + injectColumnNames(summaryRow.query) + ")"}
          >
              {summaryRow.queryLabel}
          </div>
          {#each $state.columnDefs as def, x}
            <SummaryRow activeBoard={activeBoard} def={def} width={width} query={summaryRow.query} sumType={summaryRow.summaryDefs[def.id] ? summaryRow.summaryDefs[def.id] : 0}
              on:set-sumtype={(e)=>{
                activeBoard.requestChanges([{ type: "set-summary-row", summaryRow: {id: summaryRow.id, query: summaryRow.query, queryLabel: summaryRow.queryLabel, summaryDefs: {...summaryRow.summaryDefs, [def.id]: e.detail}} }]);
              }} 
            />
          {/each}
        </div>
      {/each}
      {/if}
      {#if newSummaryRowModal}
        <div class="modal" on:click={
          (e)=>{
            if (e.target == e.currentTarget) {
              newSummaryRowModal = false
            }
          }
        }>
          <div class="modal-content" transition:scale="{{ duration: 200 }}">
            <div class="modal-header">
              <h2>
                <span class="close" on:click={()=>{newSummaryRowModal = false}}>&times;&nbsp;</span>
                Add summary rows</h2>
            </div>
            {#each $state.queries as query}
              <div class="modal-body" style="display:flex; margin: 10px 0">
                <button
                  class="add-summary-row-button"
                  on:click={()=>{
                    // add summary row to board
                    let summaryDefs = {}
                    $state.columnDefs.forEach(def=> {
                      // if (def.type) {
                      //   summaryDefs[def.id] = def.type
                      // }
                      summaryDefs[def.id] = 0
                    })
                    activeBoard.requestChanges([{ type: "add-summary-row", summaryRow: {id: uuidv1(), query: query.query, queryLabel: query.label, summaryDefs: summaryDefs}}]);
                  }}>
                  <SvgIcon icon=faPlus size=10 style="height:20px;"/>
                  </button>&nbsp;
                <h3>{query.label}</h3>
              </div>
            {/each}
            <!-- allow adding a new summary row for each label from a label row -->
            Summary by unique value: 
            <select
              on:change={(e)=>{
                addUniqueSummaryFromColumn = e.target.value
              }}
            >
              <option></option>
              {#each $state.columnDefs as def}
                <option value={def.id}>{def.name}</option>
              {/each}
            </select>
            {#if addUniqueSummaryFromColumn}
              {@const columnValues = $state.rows.map(row=>row.cells[addUniqueSummaryFromColumn]?.value)}
              {#each Array.from(new Set(columnValues)) as value}
                <div class="modal-body" style="display:flex; margin: 10px 0">
                  <button
                    class="add-summary-row-button"
                    on:click={()=>{
                      // add summary row to board
                      let summaryDefs = {}
                      $state.columnDefs.forEach(def=> {
                        // if (def.type) {
                        //   summaryDefs[def.id] = def.type
                        // }
                        summaryDefs[def.id] = 0
                      })
                      activeBoard.requestChanges([{ type: "add-summary-row", summaryRow: {id: uuidv1(), query: `${addUniqueSummaryFromColumn} == ${JSON.stringify(value)}`, queryLabel: `${value}`, summaryDefs: summaryDefs}}]);
                    }}>
                    <SvgIcon icon=faPlus size=10 style="height:20px;"/>
                  </button>&nbsp;
                  <h3>{$state.columnDefs.find(def=>def.id == addUniqueSummaryFromColumn).name} = {value}</h3>
                </div>
              {/each}
            {/if}
          </div>
        </div>
      {/if}
      <div
        on:mousedown={()=>{newSummaryRowModal = true}}
        class="add-summary-row-wrapper" 
        style="width: {200 * $state.columnDefs.length + 1}px">
        Add Summary Row&nbsp;
        <div class="add-column-button">
          <SvgIcon icon=faPlus size=10 style="height: 23px;"/>
        </div>
      </div>
    </div>
  {/if}
  {/if}
</div>
<style>

  .form-group {
    text-align: center;
    margin-bottom: 0.2em;
  }

  .modal {
    position: fixed;
    z-index: 1;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: rgb(0, 0, 0);
    background-color: rgba(0, 0, 0, 0.6);
    border: none;
  }
  
  .modal-content {
    background-color: #ffecd4;
    position: static;
    left: 0;
    margin: 15% auto;
    padding: 20px;
    border: 1px solid #888;
    width: fit-content;
    max-width: 80%;
    min-width: 300px;
  }

  .close {
    color: #aaa;
    /* float: right; */
    font-size: 28px;
    font-weight: bold;
  }

  .close:hover,
  .close:focus {
    color: black;
    text-decoration: none;
    cursor: pointer;
  }

  .data-table {
  }

  .header-actions-cell {
    width: 22px;
    cursor: pointer;
    border-right: 1px solid #462700;
  }

  .header-action-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    margin: 2px;
  }

  .pocket-button {
    padding: 0;
    background-color: transparent;
    border: none;
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .pocket-button:hover {
    transform: scale(1.1);
  }

  .add-column-header {
    width: 22px;
    cursor: pointer;
  }

  .row-actions-cell {
    width: 72px;
    cursor: pointer;
    border-right: 1px solid #462700;
    display: flex;
  }

  .row-action-wrapper {
    display: flex;
    align-items: center;
  }

  .add-row-wrapper {
    margin-left: 81px;
    cursor: pointer;
    background: #b9b9b9;
    display: flex;
    width: fit-content;
    justify-content: center;
    border: 1px solid;
    border-top: 0;
    border-bottom: 0;
  }

  .add-row-wrapper:hover {
    background: #ababab;
  }

  .add-summary-row-wrapper {
    margin-left: 81px;
    cursor: pointer;
    background: #b9b9b9;
    display: flex;
    width: fit-content;
    justify-content: center;
    border: 2px solid rgb(97, 97, 97);
    border-top: 0;
    border-left-width: 1px;
    border-bottom-width: 1px;
  }

  .add-summary-row-wrapper:hover {
    background: #ababab;
  }

  .summary-row-label-main {
    margin-left: 19px;
  }

  .header-row {
    display: flex;
    width: fit-content;
  }
  .header-cell {
    font-weight: bold;
    color: black;
    background-color: #ededed;
    border-top: 1px solid #462700;
    display: flex;
  }

  .column-title {
    width: 84%;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .header-caret {
    cursor: pointer;
  }

  .header-caret:hover {
    color: #555;
  }

  .header-row {
    margin-left: 60px;
  }

  .header-cell .pocket-button,
  .header-cell .header-caret {
    opacity: 0;
  }

  .header-cell:hover .pocket-button,
  .header-cell:hover .header-caret {
    opacity: 1;
  }
 
  .data-row {
    display: flex;
    width: fit-content;
    margin-left: 10px;
  }

  /* .data-row .pocket-button,
  .data-row .trash-button,
  .data-row .expand-button
  {
    opacity: 0;
  } */

  .data-row:hover .pocket-button,
  .data-row:hover .trash-button,
  .data-row:hover .expand-button {
    opacity: 1;
  }

  .summary-row {
    display: flex;
    width: fit-content;
    border-right: 1px solid #462700;
  }

  .summary-row .remove-summary-row {
    opacity: 0;
  }

  .summary-row:hover .remove-summary-row {
    opacity: 1;
  }

  .data-cell, .header-cell {
    padding-right: 2px;
    padding-left: 2px;
    border-right: 1px solid #462700;
    border-bottom: 1px solid #462700;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .header-cell {
    background-color: #c2c2c2;
  }

  .data-cell {
    background-color: #ffffff;
    color: #1a1a1a;
    transition: background-color 0.15s ease;
  }

  .data-cell:hover {
    background-color: #ffffff;
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
    height: calc(100vh - 92px);
    border-bottom: 1px solid #a1a1a1;
  }
  .top-bar {
    /* box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.15); */
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    background: rgb(105, 105, 105);
    /* padding: 10px 15px; */
    border-radius: 0;
    position: sticky;
    width: 100%;
    top: 0;
    left: 0;
    z-index: 200;
    color: white;
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
    background: #dbdbdbdb;
    border: 1px solid rgba(35, 32, 74, 0.1);
    box-shadow: 0px 4px 4px rgba(66, 66, 66, 0.1);
    border-radius: 5px;
    padding: 5px 10px;
    display: flex;
    transform: scale(1);
    align-items: center;
    justify-content: center;
    transition: all .25s ease;
    color: white;
    margin-left: 6px !important;
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

  .filter-by {
    display: flex;
    align-items: center;
    margin-right: 8px;
    height: 47px;
    padding-right: 10px;
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

  :global(.attachment-button) {
    width: 30px;
    height: 30px;
    padding: 4px;
    border-radius: 50%;
    /* border: 1px solid #f2bb78;
    background-color: #e6a85d;     */
    border: 1px solid #dbdbdbdb;
    transition: all .25s ease;
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
    top: 50px;
    right: 10px;
    z-index: 10;
    background-color: rgb(63 63 63);
    display:flex;
    flex-direction: column;
    max-height: calc(100vh - 160px);
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
    border: solid 1px rgb(255, 255, 255);
    background-color: rgba(199, 199, 199, 0.1);
  }
  .idle {
    opacity: 0.5;
  }

  .remove-summary-row {
    width: 18px;
    height: 18px;
    padding: 2px;
    background: rgb(190, 114, 0);
    border: 0px;
    border-radius: 14px;
    color: white;
    font-weight: bold;
    font-size: 10px;
    margin-top: 5px;
    margin-left: 1px;
  }

  .remove-summary-row:hover {
    background: rgb(243, 153, 19);
  }

  .summary-row-label {
    width: 62px; padding: 6px; 
    font-size: 12px; 
    overflow:hidden; text-overflow:ellipsis; 
    height: 24px; 
    font-style: italic;
  }

  .expand-button, .trash-button {
    background-color:#c2c2c2; 
    color:#3c3c3c; 
    font-weight: bold; 
    display:flex; 
    align-items: center; 
    justify-content: center; 
    width:19px; 
    height:19px; 
    cursor: pointer; 
    margin: 2px;
    border-radius: 2px;
  }
  
  .trash-button:hover {
    background-color:#a4a4a4; 
  }

  .expand-button:hover {
    background-color:#a4a4a4
  }

  .add-column-button {
    /* background-color:#c2c2c2;  */
    color:#3c3c3c; 
    font-weight: bold; 
    display:flex; 
    align-items: center; 
    justify-content: center; 
    width:19px; 
    height:18px; 
    cursor: pointer; 
    margin: 2px;
    border-radius: 2px;
  }

  .add-column-button:hover {
    background-color:rgb(210, 210, 210);
  }

  .add-summary-row-button {
    background-color:#c2c2c2; 
    color:#424242; 
    font-weight: bold; 
    display:flex; 
    align-items: center; 
    justify-content: center; 
    width:19px; 
    height:18px; 
    cursor: pointer; 
    margin: 2px;
    border-radius: 2px;
  }

  .add-summary-row-button:hover {
    background-color:rgb(210, 210, 210);
  }
</style>
