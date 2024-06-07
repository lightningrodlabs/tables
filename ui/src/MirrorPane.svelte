<script lang="ts">
  import { getContext, onMount } from "svelte";
  import { jsPDF } from "jspdf";
  import { iframe2image } from "iframe2image";
  import type { TablesStore } from "./store";
  import LabelSelector from "./LabelSelector.svelte";
  import { v1 as uuidv1 } from "uuid";
  // import {Mirror, type MirrorProps, type Feed, type FeedItem, sortedFeedKeys, feedItems, deltaToFeedString } from "./mirror";
  import EditMirrorDialog from "./EditMirrorDialog.svelte";
  import AddColumnModal from "./AddColumnModal.svelte";
  import EditHeader from "./EditHeader.svelte";
  import CellEdit from "./CellEdit.svelte";
  import Avatar from "./Avatar.svelte";
  import SummaryRow from "./SummaryRow.svelte";
  import { decodeHashFromBase64 } from "@holochain/client";
  import type { EntryHash, ActionHash, Timestamp } from "@holochain/client";
  import { cloneDeep, isEqual } from "lodash";
  import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
  import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
  import { onVisible } from "./util";
  import SvgIcon from "./SvgIcon.svelte";
  // import { exportMirror } from "./export";
  import { Marked, Renderer } from "@ts-stack/markdown";
  import hljs from 'highlight.js';
  import AttachmentsList from './AttachmentsList.svelte';
  // import AttachmentsDialog from "./AttachmentsDialog.svelte"
  import type { WAL } from "@lightningrodlabs/we-applet";
  import DragDropList, { VerticalDropZone, reorder, type DropEvent, HorizontalDropZone } from 'svelte-dnd-list';
  import CellDisplay from "./CellDisplay.svelte";
  import DataView from "./DataView.svelte";
  import Queries from './Queries.svelte'
  import { scale } from 'svelte/transition';
  import { getTableValues, getRowValues, getColumnValues, getValueOfCell, getValueOfColumnSummary } from './DataHelpers';
  import { weaveUrlToWAL, weaveUrlFromWal } from "@lightningrodlabs/we-applet";

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
  $: dataView = false;
  $: addUniqueSummaryFromColumn = null;

  function setFilterOption(newOption) {
    filterOption = newOption;
  }

  const { getStore } :any = getContext("store");
  let store: TablesStore = getStore();

  export let activeMirror: Mirror
  export let standAlone = false

  $: uiProps = store.uiProps
  $: participants = activeMirror.participants()
  // $: activeHashB64 = store.mirrorList.activeMirrorHashB64;
  $: activeHashB64 = activeMirror.hashB64
  $: activeRow = store.mirrorList.activeRow;

  // let columnDefs: Array<ColumnDef> = []

  let editMirrorDialog: EditMirrorDialog
  $: state = activeMirror.readableState()
  let queriedData = {};
  $: queriedData;
  let newSummaryRowModal = false;
  $: newSummaryRowModal;
  function init(el){
    //if (el)
     // el.focus()
  }

  let cellValues = {}

  async function setCellValues() {
    if ($state.variables) {
      for (const variable of $state.variables) {
        let wal: WAL = weaveUrlToWAL(variable.value);
        switch (wal?.context?.assetType) {
          case "Cell":
            const valueOfCell = await getValueOfCell(wal.hrl[1], wal.context?.cellId?.rowId, wal.context?.cellId?.columnId, store)
            cellValues[variable.name] = valueOfCell
            break
          case "Column Summary":
            const valueOfSummary = await getValueOfColumnSummary(wal.hrl[1], wal.context?.columnId, wal.context?.sumType, store, "true")
            console.log(valueOfSummary)
            cellValues[variable.name] = valueOfSummary
            break
          case "Table":
            console.log("table")
            const tableValues = await getTableValues(wal.hrl[1], store)
            console.log(tableValues)
            cellValues[variable.name] = tableValues
            break
          case "Row":
            console.log("row")
            const rowValues = await getRowValues(wal.hrl[1], wal.context?.rowId, store)
            console.log(rowValues)
            cellValues[variable.name] = rowValues
            break
          case "Column":
            console.log("column")
            const columnValues = await getColumnValues(wal.hrl[1], wal.context?.columnId, store)
            console.log(columnValues)
            cellValues[variable.name] = columnValues
            break
          }
      }
    }
  }

  const download = (filename: string, text: string) => {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }

  const closeMirror = async () => {
    await store.closeActiveMirror(false);
  };

  const leaveMirror = async () => {
    await store.closeActiveMirror(true);
  };

  onMount(async () => {
    await setCellValues();
  });
</script>

<button on:click={
  () => {
   setCellValues();
  }
}>set</button>

<div class="mirror" >
  {#if activeHashB64}
    <EditMirrorDialog {activeHashB64} bind:this={editMirrorDialog}></EditMirrorDialog>
  {/if}

  <div class="top-bar">
    <div class="left-items">
      {#if standAlone}
        <h2>{$state.name}</h2>
      {:else}
        <sl-button class="mirror-button close" on:click={closeMirror} title="Close">
          <SvgIcon icon=faClose size="16px"/>
        </sl-button>
        <h1>{$state.name}</h1>
      {/if}
      <sl-menu-item on:click={()=> editMirrorDialog.open(cloneDeep(activeMirror.hash))} class="board-settings" >
        <SvgIcon icon="faEdit"  style="background: transparent; opacity: .5; position: relative; top: -2px;" size="14px"/> <span>Edit</span>
    </sl-menu-item>
    </div>
  </div>
  {#if $state}
    {@const rawSubbed = $state.raw.replace(/!weave{(.*?)}/g, (match, p1) => {
      const variable = $state.variables.find(v => v.name === p1);
      return variable ? JSON.stringify(cellValues[p1]) : match;
    })}
    <!-- <button on:click={
      () => {
        const pdf = new jsPDF('p', 'mm', [297, 210]);
        pdf.html($state.raw, {
          callback: function (pdf) {
            pdf.save("mirror.pdf");
          }
        });
      }
    }>Save PDF</button> -->
    <div class="second-row">
      <iframe srcdoc={
        rawSubbed
      }></iframe>
    </div>
  {/if}
</div>
<style>
  iframe {
    border: none;
    background-color: white;
  }
  iframe > html {
    height: fit-content;
  }

  body, html {width: 100%; height: 100%; margin: 0; padding: 0}
  .first-row {position: absolute;top: 0; left: 0; right: 0; height: 0px; background-color: lime;}
  .second-row {
    position: absolute; 
    /* top: 100px;  */
    height: 100vh;
    left: 0; 
    right: 0; 
    /* bottom: 0;  */
    background-color: red 
  }
  .second-row iframe {display: block; width: 100%; height: 100%; border: none;}
</style>