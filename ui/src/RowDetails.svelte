<script lang="ts">
  import '@shoelace-style/shoelace/dist/components/select/select.js';
  import '@shoelace-style/shoelace/dist/components/option/option.js';
  import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
  import '@shoelace-style/shoelace/dist/components/input/input.js';
  import { cloneDeep, isEqual } from "lodash";
  import { v1 as uuidv1 } from "uuid";
  import { getContext, onMount } from 'svelte';
  import type { TablesStore } from './store';
  import Avatar from './Avatar.svelte';
  import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
  import type { ColumnId, Row, RowId, RowProps } from "./board";

  import { Marked } from "@ts-stack/markdown";
  import SvgIcon from "./SvgIcon.svelte";
  import ClickEdit from './ClickEdit.svelte';
  import AttachmentsList from './AttachmentsList.svelte';
  import AttachmentsDialog from "./AttachmentsDialog.svelte"
  import type { HrlWithContext } from '@lightningrodlabs/we-applet';

  
  const { getStore } :any = getContext("store");
  let store: TablesStore = getStore();
  $: activeBoard = store.boardList.activeBoard;
  $: state = $activeBoard.readableState()
  $: row = $state.rows.find(c=>c.id == rowId)
  $: props = cloneDeep(row ? row.props : DEFAULT_PROPS) as RowProps
  $: labelTypes = $state.labelDefs
  $: columnDefs = $state.columnDefs
  $: allProfiles = store.profilesStore.allProfiles

  const DEFAULT_PROPS = {attachments:[]}

  export let rowId: RowId
  export let showControls = true


  let inputElement

  export const reset = ()=>{
  }

  const close = ()=> {
    store.boardList.setActiveRow(undefined)
  }

  const handleDelete = (id: RowId) => {
    requestChanges([{ type: "delete-row", id }]);
    close()
  };

  const handleSave = (props:RowProps, doClose=false) => {
      if (row) {
        let changes = []
        if (!isEqual(row.props, props)) {
          changes.push({ type: "update-row-props", id: row.id, props: cloneDeep(props)})
        }
        if (changes.length > 0) {
          requestChanges(changes);
        }
      }
      if (doClose) {
        close()
      }
  };
    
  const requestChanges = (changes) => {
    $activeBoard.requestChanges(changes)
  }

  let labelSelect



  const doFocus = (node) => {
    // otherwise we get an error from the shoelace element
    setTimeout(() => {
      node.focus()
    }, 50);
  }

  let attachmentsDialog : AttachmentsDialog

  const removeAttachment = (idx: number) => {
    props.attachments.splice(idx,1)
    handleSave(props)
  }

  const copyHrlToClipboard = () => {
    const attachment: HrlWithContext = { hrl: [store.dnaHash, $activeBoard.hash], context: rowId }
    store.weClient?.hrlToClipboard(attachment)
  }

  const columnName = (defId: ColumnId) => {
    const def = $state.columnDefs.find((col)=>col.id==defId)
    if (def) {return def.name}
    return ""
  }
</script>

{#if store.weClient}
  <AttachmentsDialog activeBoard={$activeBoard} bind:this={attachmentsDialog}
  on:save={(e)=>{
    props.attachments = e.detail.attachments
    handleSave(props)
  }}
  ></AttachmentsDialog>
{/if}

<div class='card-editor'>
  <div class="card-wrapper">
    <div class="card-elements">
      
      <div style="display:flex;justify-content:space-between">
        <div class="card-title">
        </div>
        {#if showControls}
          <div class="card-controls">
            
            {#if store.weClient}
              <div class="details-button pocket-button" title="Add this record to pocket" on:click={()=>copyHrlToClipboard()}>
                <SvgIcon icon=addToPocket size="25px"/>
              </div>
            {/if}
            {#if handleDelete}
              <div class="details-button delete-button" title="Delete this record" on:click={()=>handleDelete(rowId)}>
                <SvgIcon icon=faTrash size="16px"/>
              </div>
            {/if}
            <div class="details-button" title="Close this record" on:click={(e)=>{close()}}>
              <SvgIcon icon=faClose size="18px"/>
            </div>
          </div>
        {/if}
      </div>
      <div class="belongs-to" style="display:flex; align-items: center;">
        {#if row && row.creator}
          <div style="margin-left:20px;margin-right:5px;">Created by:</div><Avatar size={20}  agentPubKey={decodeHashFromBase64(row.creator)}/>
        {/if}
      </div>
      <div class="row-fields">
          {#if row}
            {#each Object.entries(row.cells) as [defId, cell]}
              <div>
              {columnName(defId)}: {cell.value}
              </div>
            {/each}
          {/if}
      </div>

    {#if store.weClient}
      <div style="display:flex; flex-wrap:wrap; align-items: center; margin-bottom:10px;">
        <div style="margin-left:10px; margin-right:10px;">
          <button title="Manage Record Attachments" class="attachment-button" 
            on:click={()=>attachmentsDialog.open(row.props.attachments,"row")} >          
            <SvgIcon icon="link" size="16px"/>
          </button>
        </div>
        {#if props.attachments}
          <AttachmentsList attachments={props.attachments}
            on:remove-attachment={(e)=>removeAttachment(e.detail)}/>
        {/if}
      </div>
    {/if}

    </div>
  </div>
</div>
<style>
  .card-editor {
    display: flex;
    flex-basis: 100%;
    font-style: normal;
    color: rgba(35, 32, 74, 1.0);
    justify-content: space-between;
    flex-direction: column;
  }

  .card-wrapper {
    max-height: calc(100vh - 160px);
    overflow-x: auto;
  }

  .card-wrapper::-webkit-scrollbar {
    width: 5px;
    background-color: transparent;
  }

  .card-wrapper::-webkit-scrollbar-thumb {
      height: 5px;
      border-radius: 5px;
      background: rgba(20,60,119,.3);
      opacity: 1;
  }
  .card-elements {
    display: flex;
    flex-direction: column;
    flex-basis: 100%;
    padding: 20px;
  }

  .category-selector {
    width: 100%;
    display: flex;
    padding-bottom: 15px;
  }

  .category-button {
    width: 20px;
    height: 20px;
    border-radius: 5px;
    margin-right: 5px;
    transition: all .25s ease;
    transform: scale(1);
  }

  .category-button:hover {
    transform: scale(1.25);
    cursor: pointer;
  }

  .category-button:active {
    transform: scale(1.1);
    box-shadow: 0px 5px 5px rgba(53, 39, 211, 0.35);
  }

  .card-title {
    font-size: 24px;
    line-height: 30px;
  }

  .multi-select {
    margin: 5px 0;
  }

  .top-spacer {
    display: block;
    height: 35px;
  }

  .controls {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    padding-left: 7px;
    padding-top: 10px;
  }

  .comment-time-and-controls {
    display: flex;
  }

  .edit-card::part(base) {
    height: calc(100vh - 97px);
    bottom: 0;
    top: initial;
    z-index: 150;
  }

  .edit-card::part(body) {
    padding: 0;
  }

  .edit-card::part(panel) {
    box-shadow: 0px 10px 15px rgba(35, 32, 74, 0.2);
  }

  .edit-card::part(overlay) {
    display: none;
  }

  .belongs-to {
    opacity: .6;
    margin-top: 0;
    font-size: 14px;
  }

  .details {
    max-height: 300px;
    overflow: auto;
    font-size: 16px;
    padding: 15px 0 0 0;
  }

  .comments {
    margin-top: 5px;
    padding-top: 5px;
    background: linear-gradient(180deg, rgba(102, 138, 174, 0.1) 0%, rgba(189, 209, 230, 0) 100%);
 
  }

  .comments.card-section {
    padding-bottom: 40px;
  }

  .comments .card-label {
    opacity: .5;
    padding-bottom: 15px;
  }

  .comment-count {
    min-width: 20px;
    background-color: rgba(35, 32, 75, 1);
    height: 20px;
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 20px;
    color: #fff;
  }
  
  .comment {
    display:flex;
    flex-direction: column;
    padding-bottom: 15px;
    margin-bottom: 10px;
    box-shadow: 0px 4px 4px rgba(35, 32, 74, 0.15);
    background-color: #fff;
    line-height: 16px;
    color: #23204A;
    border-radius: 5px;
    display: flex;
    flex-direction: column;
    padding: 10px;
    transition: all .25s ease;
    height: 0;
    height: auto;
  }
  .comment-header {
    display:flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  .comment-avatar {
    margin-right:5px;
  }
  .details-button {
    cursor: pointer;
    border-radius: 50%;
    padding:2px;
    width: 30px;
    height: 30px;
    display: flex;
    justify-content: center;
    align-items: center;
    transform: scale(1);
    transition: all .25s ease;
  }

  .details-button:hover {
    transform: scale(1.25);
  }

  .details-button:active {
    transform: scale(1.1);
    box-shadow: 0px 8px 10px rgba(53, 39, 211, 0.35);
  }

  .delete-button, .archive-button, .pocket-button {
    opacity: .7;
    transition: all .25s ease;
  }

  .delete-button:hover, .archive-button:hover, .pocket-button:hover {
    opacity: 1;
  }

  .card-controls {
    position: absolute;
    top: 15px;
    z-index: 10;
    right: 15px;
    display: flex;
  }

  .card-controls .details-button {
    margin-left: 10px;
    background: #FFFFFF;
    border: 1px solid rgba(35, 32, 74, 0.1);
    box-shadow: 0px 4px 4px rgba(66, 66, 66, 0.1);
    border-radius: 5px;
  }

  .card-section {
    border-top: 1px dashed rgba(35, 32, 75, .1);
    padding: 20px;
    width: 100%;
  }

  .detail-label {
    color: rgba(35, 32, 75, .5);
    padding-bottom: 10px;
  }

  .details-button:hover {
    background-color: rgb(240, 249, 2244);
    border: solid 1px rgb(149, 219, 252);
    color:  rgb(3, 105, 161);
  }
  
  .comment-text {
    padding: 10px;
  }
  .comment-list {
    overflow-x: visible;
  }
  .comment-controls {
    display: block;
    text-align: right;
    width: 100%;
  }

  .comment-controls .comment-control {
    font-size: 12px;
    text-decoration: underline;
    padding: 5px;
    display: block;
    margin-left: 5px;
    display: inline-block;
    opacity: .5;
    transition: all .25s ease;
    margin-right: -5px;
  }

  .comment-control:hover {
    cursor: pointer;
    font-weight: bold;
    opacity: 1;
  }

  .comment-time {
    font-size: 12px;
    opacity: .5;
    min-width: 100px;
    text-align: right;
    position: relative;
    top: 4px;
  }

  .checklists {
  }

  .checklist {
    margin-top: 15px;
    border-radius: 5px;
    padding: 10px;
    font-size: 15px;
    border: 1px dashed rgba(35, 32, 75, .1);
  }

  .add-checklist {
    display: flex;
  }

  .checklist-item, .add-checklist-item {
    padding: 5px;
    display: flex;
    justify-content: space-between;
    background-color: rgba(241, 245, 247, 0);
    transition: all .25s ease;
    border-radius: 5px;
    align-items: center;
    font-size: 15px;
  }

  .checklist-item:hover {
    background-color: rgba(241, 245, 247, 1.0);
  }

  .add-checklist-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .add-checklist-item:hover {
    cursor: pointer;
    background-color: rgba(241, 245, 247, 1.0);
  }

  .add-item-icon, .adding-checklist-empty-box {
    background-color: rgba(212, 212, 216, .40);
    display: inline-flex;
    width: 16px;
    align-items: center;
    justify-content: center;
    height: 16px;
    border-radius: 3px;
    margin-right: 5px;
    position: relative;
    top: 3px;
  }

  .adding-checklist-empty-box {
    position: absolute;
    top: 10px;
    left: 5px;
    z-index: 10;
  }

  .list-title {
    font-size: 16px;
  }

  .delete-item, .convert-item {
    opacity: 0;
    position: relative;
    top: 2px;
    transition: all .25s ease;
  }

  .checklist-item:hover .delete-item {
    opacity: 1;
  }
  .checklist-item:hover .convert-item {
    opacity: 1;
  }
  .delete-item:hover, .convert-item:hover {
    cursor: pointer;
  }

  .adding-checklist-item {
    display: flex;
  }

  .adding-checklist-input-wrapper, .add-checklist-input {
    width: calc(100% - 90px);
    position: relative;
    font-size: 15px;
    margin-right: 3px;
  }

  .add-checklist-input::part(input)::placeholder, .adding-checklist-input::part(input)::placeholder {
    opacity: .7;
  }

  .adding-checklist-input::part(base) {
    padding-left: 15px;
  }
</style>
