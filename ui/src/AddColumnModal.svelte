<script lang="ts">
  import { getContext, onMount } from "svelte";
  import type { TablesStore } from "./store";
  import LabelSelector from "./LabelSelector.svelte";
  import { v1 as uuidv1 } from "uuid";
  import {LabelDef, ColumnDef, Board, type BoardProps, type Feed, type FeedItem, sortedFeedKeys, feedItems, deltaToFeedString, type Cell, Row, ColumnType, type CellId, type RowId, SumType } from "./board";
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

  const { getStore } :any = getContext("store");
  let store: TablesStore = getStore();

  export let showAddColumnModal = false;
  export let activeBoard: Board

  let columnDef: ColumnDef = {
    id: "",
    name: "",
    type: ColumnType.String,
    sumType: SumType.None
  };

  function addColumn() {
    // const newColumn = new ColumnDef(``,columnDef.type)
    if (columnDef.name == "") {
      columnDef.name = `Field ${activeBoard.state().columnDefs.length + 1}`;
    }
    activeBoard.requestChanges([{ type: "add-column", name: columnDef.name, columnType: columnDef.type, sumType: columnDef.sumType}]);
  }

  onMount(() => {
    if (activeBoard) {
      columnDef.id = uuidv1();
    }
  });

</script>

{#if activeBoard && showAddColumnModal}
{@const columnTypes = Object.values(ColumnType).filter((key) => isNaN(Number(key)))}

<div class="modal">
  <div class="modal-content">
    <div class="form-group">
      <h2>Add a field</h2>
    </div>
    <div class="form-group">
      <input
        type="text"
        class="form-control"
        id="column-name"
        placeholder="Field name (optional)"
        bind:value={columnDef.name}
      />
    </div>
    <div class="form-group">
      <label for="column-type">Type</label>
      <select
        class="form-control"
        id="column-type"
        bind:value={columnDef.type}
      >
        {#each columnTypes as type}
          <option value={columnTypes.indexOf(type)}>{type}</option>
        {/each}
      </select>
    </div>
    <div class="form-group">
      <button
        type="button"
        class="btn btn-secondary"
        on:click={() => {showAddColumnModal = false}}
      >
        Cancel
      </button>
      <button
        type="button"
        class="btn btn-primary"
        on:click={() => {
          addColumn();
          activeBoard = null;
          showAddColumnModal = false;
        }}
      >
        
        Add Column
      </button>
    </div>
  </div>
</div>

{/if}


<style>
  .form-group {
    text-align: center;
    margin-bottom: 0.2em;
  }

  .modal {
    /* display: none;
    position: fixed;
    z-index: 1;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: rgb(0, 0, 0);
    background-color: rgba(0, 0, 0, 0.4); */
    position: relative;
    height: 0;
    padding: 0;
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
    background-color: rgba(0, 0, 0, 0.4);
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
  
  /* .modal-content {
    background-color: #fefefe;
    position: absolute;
    top: 22px;
    left: -202px;
    padding: 14px;
    border: 1px solid #888;
    width: fit-content;
  } */

  .close {
    color: #aaa;
    float: right;
    font-size: 28px;
    font-weight: bold;
  }

  .close:hover,
  .close:focus {
    color: black;
    text-decoration: none;
    cursor: pointer;
  }
</style>
