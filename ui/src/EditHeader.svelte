<script lang="ts">
  import { getContext, onMount } from "svelte";
  import type { TablesStore } from "./store";
  import LabelSelector from "./LabelSelector.svelte";
  import { v1 as uuidv1 } from "uuid";
  import {LabelDef, ColumnDef, Board, type BoardProps, type Feed, type FeedItem, sortedFeedKeys, feedItems, deltaToFeedString, type Cell, Row, ColumnType, type CellId, type RowId } from "./board";
  import EditBoardDialog from "./EditBoardDialog.svelte";
  import CellEdit from "./CellEdit.svelte";
  import Avatar from "./Avatar.svelte";
  import { decodeHashFromBase64, type Timestamp } from "@holochain/client";
  import { cloneDeep, isEqual } from "lodash";
  import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
  import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
  import { onVisible } from "./util";
  import { isWeContext, type WAL, weaveUrlFromWal } from "@lightningrodlabs/we-applet";
  import SvgIcon from "./SvgIcon.svelte";
  import { exportBoard } from "./export";
  import { Marked, Renderer } from "@ts-stack/markdown";
  import hljs from 'highlight.js';
  import AttachmentsList from './AttachmentsList.svelte';
  import AttachmentsDialog from "./AttachmentsDialog.svelte"
  import type { HrlWithContext } from "@lightningrodlabs/we-applet";
  import RowDetailsDrawer from "./RowDetailsDrawer.svelte";
    
  export let showEditHeader = false;
  export let activeBoard: Board
  export let editHeaderIndex = null;

  let columnName
  let columnType
  let viewType = "choice"
  let addTo = ""

  onMount(() => {
    columnName = $state.columnDefs[editHeaderIndex].name;
    columnType = $state.columnDefs[editHeaderIndex].type;
  })
  
  $: state = activeBoard.readableState()

</script>
{#if activeBoard}
{@const columnTypes = Object.values(ColumnType).filter((key) => isNaN(Number(key)))}

<div class="modal">
  {columnName}
  <div class="modal-content">

    {#if viewType === "choice"}
      <h2>Choose an action for {columnName}</h2>
      <!-- edit -->
      <div class="form-group">
        <button
          class="choice-button"
          on:click={()=>{
            viewType = "edit";
          }}
        >Edit</button>
      </div>
      
      <div class="form-group">
        <!-- insert to the left button -->
        <button
          class="choice-button"
          on:click={()=>{
            // const columnDefs = cloneDeep($state.columnDefs);
            // columnDefs.splice(editHeaderIndex, 0, {name: columnName, type: columnType});
            // activeBoard.requestChanges([{ type: "set-column-defs",  "columnDefs": columnDefs}]);
            // showEditHeader = false;
            addTo = "left";
            viewType = "add";
          }}
        >Insert to the left</button>
      </div>
      
      <div class="form-group">
        <!-- insert to the right button -->
        <button
          class="choice-button"
          on:click={()=>{
            // const columnDefs = cloneDeep($state.columnDefs);
            // columnDefs.splice(editHeaderIndex + 1, 0, {name: columnName, type: columnType});
            // activeBoard.requestChanges([{ type: "set-column-defs",  "columnDefs": columnDefs}]);
            // showEditHeader = false;
            addTo = "right";
            viewType = "add";
          }}
        >Insert to the right</button>
      </div>

      <div class="form-group">
        <!-- delete button -->
        <button
          class="choice-button"
          on:click={()=>{
            const columnDefs = cloneDeep($state.columnDefs);
            columnDefs.splice(editHeaderIndex, 1);
            activeBoard.requestChanges([{ type: "set-column-defs",  "columnDefs": columnDefs}]);
            showEditHeader = false;
          }}
        >Delete</button>
      </div>
      <div class="form-group">
        <button
          class="choice-button"
          on:click={()=>{
            showEditHeader = false;
          }}
        >Cancel</button>
      </div>
    {:else if viewType === "edit"}
      <h2>Edit Header</h2>

      <div class="form-group">
        <input
          type="text"
          class="form-control"
          id="column-name"
          placeholder="Field name (optional)"
          bind:value={columnName}
        />
      </div>
      <div class="form-group">
        <label for="column-type">Type</label>
        <select
          class="form-control"
          id="column-type"
          bind:value={columnType}
        >
          {#each columnTypes as type}
            {#if type !== "TableLink"}
              <option value={columnTypes.indexOf(type)}>{type}</option>
            {/if}
          {/each}
        </select>
      </div>

      <div class="form-group">
        <button
          on:click={()=>{
            showEditHeader = false;
          }}
        >Cancel</button>
        <button
        on:click={()=>{
          const columnDefs = cloneDeep($state.columnDefs);
          console.log(editHeaderIndex);
          console.log(columnDefs[editHeaderIndex]);
          columnDefs[editHeaderIndex].name = columnName;
          columnDefs[editHeaderIndex].type = columnType;
          console.log(columnDefs);
          activeBoard.requestChanges([{ type: "set-column-defs",  "columnDefs": columnDefs}]);
          showEditHeader = false;
        }}
        >Save</button>
      </div>
    {:else if viewType === "add"}
      <h2>Add field to the {addTo}</h2>
      <div class="form-group">
        <input
          type="text"
          class="form-control"
          id="column-name"
          placeholder="Field name (optional)"
          bind:value={columnName}
        />
      </div>
      <div class="form-group">
        <label for="column-type">Type</label>
        <select
          class="form-control"
          id="column-type"
          bind:value={columnType}
        >
          {#each columnTypes as type}
            <option value={columnTypes.indexOf(type)}>{type}</option>
          {/each}
        </select>
      </div>
      <!-- cancel button -->
      <div class="form-group">
        <button
          on:click={()=>{
            showEditHeader = false;
          }}
        >Cancel</button>
        <button
          on:click={()=>{
            const columnDefs = cloneDeep($state.columnDefs);
            if (addTo === "left") {
              columnDefs.splice(editHeaderIndex, 0, {name: columnName, type: columnType, id: uuidv1()});
            } else if (addTo === "right") {
              columnDefs.splice(editHeaderIndex + 1, 0, {name: columnName, type: columnType, id: uuidv1()});
            }
            activeBoard.requestChanges([{ type: "set-column-defs",  "columnDefs": columnDefs}]);
            showEditHeader = false;
          }}
        >Add</button>
      </div>
    {/if}
  </div>
</div>
{/if}

<style>
.form-group {
  text-align: center;
  margin-bottom: 0.2em;
}

.choice-button {
  width: 200px;
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
  border:none;
}

.modal-content {
  background-color: #fefefe;
  position: static;
  left: 0;
  margin: 15% auto;
  padding: 20px;
  border: 1px solid #888;
  width: fit-content;
  max-width: 80%;
}
</style>