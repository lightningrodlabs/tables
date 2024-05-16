<script lang="ts">
  import { getContext, onMount } from "svelte";
  import { jsPDF } from "jspdf";
  import { iframe2image } from "iframe2image";
  import type { TablesStore } from "./store";
  import LabelSelector from "./LabelSelector.svelte";
  import { v1 as uuidv1 } from "uuid";
  // import {Mirror, type MirrorProps, type Feed, type FeedItem, sortedFeedKeys, feedItems, deltaToFeedString } from "./mirror";
  // import EditMirrorDialog from "./EditMirrorDialog.svelte";
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

  $: state = activeMirror.readableState()
  // $: if ($state) {
  //   console.log("hi")
  //   rawSubbed = state.raw;
  //   console.log("ho", rawSubbed)
  //   for (const variable of state.variables) {
  //     rawSubbed = rawSubbed.replace(`<weave>${variable.name}</weave>`, variable.value);
  //   }
  // }
  let queriedData = {};
  $: queriedData;
  let newSummaryRowModal = false;
  $: newSummaryRowModal;
  function init(el){
    //if (el)
     // el.focus()
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

  onMount(() => {
    
  });
</script>

<div class="mirror" >
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
    </div>
  </div>
  {#if $state}
    {@const rawSubbed = $state.raw.replace(/<weave>(.*?)<\/weave>/g, (match, p1) => {
      const variable = $state.variables.find(v => v.name === p1);
      console.log("variable", variable)
      return variable ? variable.value : match;
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