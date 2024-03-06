<script lang="ts">
  import { getContext, onMount } from "svelte";
  import type { TablesStore } from "./store";
  import LabelSelector from "./LabelSelector.svelte";
  import type { v1 as uuidv1 } from "uuid";
  import {LabelDef, ColumnDef, Board, type BoardProps, type Feed, type FeedItem, sortedFeedKeys, feedItems, deltaToFeedString, type Cell, Row, ColumnType, type CellId, type RowId } from "./board";
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
    
  export let showEditHeader = false;
  export let activeBoard: Board
  export let editHeaderIndex = null;

  
  $: state = activeBoard.readableState()

  let columnName = $state ? $state.columnDefs[editHeaderIndex].name : "";
</script>
{#if activeBoard}
{@const columnTypes = Object.values(ColumnType).filter((key) => isNaN(Number(key)))}

<div class="modal">
  <div class="modal-content">
    <input
    type="text"
    bind:value={columnName}
    />
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
    console.log(columnDefs);
    activeBoard.requestChanges([{ type: "set-column-defs",  "columnDefs": columnDefs}]);
    showEditHeader = false;
  }}
  >Save</button>
</div>
</div>
{/if}

<style>
  .modal {
    position: relative;
    height: auto;
    padding: 0;
    overflow: auto;
  }

  .modal-content {
    background-color: #fefefe;
    position: fixed;
    top: 0;
    left: 0;
    padding: 20px;
    border: 1px solid #888;
    width: fit-content;
    z-index: 9999; /* Add this line */
  }
</style>