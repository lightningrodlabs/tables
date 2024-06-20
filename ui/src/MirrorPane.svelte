<script lang="ts">
  import { getContext, onMount } from "svelte";
  import type { TablesStore } from "./store";
  import EditMirrorDialog from "./EditMirrorDialog.svelte";
  import { cloneDeep, isEqual } from "lodash";
  import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
  import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
  import SvgIcon from "./SvgIcon.svelte";
  import { Marked, Renderer } from "@ts-stack/markdown";
  import hljs from 'highlight.js';
  import AttachmentsList from './AttachmentsList.svelte';
  import type { WAL } from "@lightningrodlabs/we-applet";
  import { getTableValues, getRowValues, getColumnValues, getValueOfCell, getValueOfColumnSummary } from './DataHelpers';
  import { weaveUrlToWAL, weaveUrlFromWal } from "@lightningrodlabs/we-applet";
  import jsPDF from 'jspdf';

  export let showSettings: boolean = true;

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

  export let activeMirror;
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
  $: cellValues;
  let attachmentsDialog;
  let activeBoard = store.activeBoard;

  const walToPocket = () => {
    const attachment: WAL = { hrl: [store.dnaHash, activeMirror.hash], context: {assetType: "Mirror"} }
    store.weClient?.walToPocket(attachment)
  }

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
            console.log(cellValues)
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
    setTimeout(async () => {
      console.log("Setting cell values")
      await setCellValues();
      console.log("Cell Values: ", cellValues)
    }, 1000)
  });
  // setInterval(async() => {
  //   console.log("Setting cell values")
  //   await setCellValues();
  // }, 8000)
</script>

<div class="mirror" >
  {#if activeMirror.hash}
    <EditMirrorDialog {activeHashB64} mirrorHash={activeMirror.hash} name={$state.name} raw={$state.raw} variables={$state.variables} bind:this={editMirrorDialog}
      on:mirror-updated={async (newMirror) => {
        await new Promise(r => setTimeout(r, 2000));
        await setCellValues();
      }}
    ></EditMirrorDialog>
  {/if}

  {#if showSettings}
    <div class="top-bar">
      <div class="left-items">
        <sl-menu style="display: flex; flex-direction: row">
          {#if standAlone}
            <sl-menu-item>
              <h2>{$state.name}</h2>
            </sl-menu-item>
          {:else}
            <button class="mirror-button close" on:click={closeMirror} title="Close">
              <SvgIcon icon=faClose size="12px"/>
            </button>
            <sl-menu-item>
              <strong style="font-size: 1em; margin: auto;">{$state.name}</strong>
            </sl-menu-item>
          {/if}
          <sl-menu-item on:click={()=> editMirrorDialog.open(cloneDeep(activeMirror.hash))} class="board-settings" >
            <SvgIcon icon="faEdit"  style="background: transparent; opacity: .5; position: relative; top: -2px;" size="14px"/> <span>Edit</span>
          </sl-menu-item>
          <sl-menu-item on:click={
            () => {
              setCellValues();
            }
          }>reset</sl-menu-item>
          <!-- download -->
          <sl-menu-item on:click={
            () => {
              const pdf = new jsPDF('p', 'mm', [297, 210]);
              pdf.html(
                $state.raw.replace(/!weave{(.*?)}/g, (match, p1) => {
                  const variable = $state.variables.find(v => v.name === p1);
                  // if variable is array, return the array as a string. otherwise return value
                  if (Array.isArray(cellValues[p1])) {
                    return JSON.stringify(cellValues[p1]);
                  } else {
                    return cellValues[p1];
                  }
                  // return variable ? JSON.stringify(cellValues[p1]) : match;
                })  
              , {
                callback: function (pdf) {
                  pdf.save("mirror.pdf");
                }
              });
            }
          }>
            pdf
          </sl-menu-item>
          {#if store.weClient}
            <!-- <sl-menu-item>
                {#if $state.boundTo.length>0}
                  <div style="margin-left:10px;display:flex; align-items: center">
                    <span style="margin-right: 5px;">Bound To:</span>
                    <AttachmentsList allowDelete={false} attachments={$state.boundTo} />
                  </div>
                {/if}
            </sl-menu-item> -->
            <sl-menu-item on:click={()=>walToPocket()}>
                <SvgIcon icon="addToPocket" size="20px"/>
            </sl-menu-item>
            <!-- <sl-menu-item>
              <button title="Manage Board Attachments" on:click={()=>attachmentsDialog.open(activeBoard.state().props.attachments,"board")} >          
                <SvgIcon icon="link" size="20px"/>
              </button>
              {#if $state.props.attachments}
                  <AttachmentsList attachments={$state.props.attachments}
                  allowDelete={false}/>
              {/if}
              </sl-menu-item> -->
          {/if}
        </sl-menu>
      </div>
    </div>
  {/if}
  {#if $state}
    {@const rawSubbed = $state.raw.replace(/!weave{(.*?)}/g, (match, p1) => {
      const variable = $state.variables.find(v => v.name === p1);
      // if variable is array, return the array as a string. otherwise return value
      if (Array.isArray(cellValues[p1])) {
        return JSON.stringify(cellValues[p1]);
      } else {
        return cellValues[p1];
      }
      // return variable ? JSON.stringify(cellValues[p1]) : match;
    })}
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

  .mirror-button {
    background: transparent;
    border: none;
    color: #000;
    cursor: pointer;
    padding: 0 12px;
    margin: 0;
  }

  .mirror-button:hover {
    background: rgb(167, 167, 167);
  }
</style>