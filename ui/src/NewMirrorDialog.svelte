<script lang="ts">
  // import MirrorEditor from './MirrorEditor.svelte';
  import type { TablesStore } from './store';
  import { getContext } from 'svelte';
  import type { Variable, MirrorState } from './mirror';
  import {Board, ColumnType, ColumnDef, SumType } from "./board";
  import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
  import '@shoelace-style/shoelace/dist/components/button/button.js';
  import '@shoelace-style/shoelace/dist/components/input/input.js';
  import type SlDialog from '@shoelace-style/shoelace/dist/components/dialog/dialog';
  import SelectRowAndValue from './SelectRowAndValue.svelte';
  import BoardSelect from './BoardSelect.svelte';
  import { getTableValues, getRowValues, getColumnValues, getValueOfCell, getValueOfColumnSummary } from './DataHelpers';
  import { weaveUrlFromWal, weaveUrlToWAL } from '@lightningrodlabs/we-applet';

  let editLabelDefs = []
  let editColumnDefs = []
  let dialog: SlDialog
  let nameInput;
  let cellValues = {}
  let variables = []
  let previousVariables = [];

  $: variables;
  $: name = ""
  $: raw = ""
  $: boardHash = ""

  const { getStore } :any = getContext('store');

  const store:TablesStore = getStore();

  const addMirror = async (name: string, variables: Array<Variable>, raw: string ) => {
      const state:Partial<MirrorState> = {name, variables, raw}
      state.feed = {}
      // state.feed[newFeedKey(store.myAgentPubKeyB64)] = {delta:{type:"create", name}, context:null}
      const mirror = await store.mirrorList.makeMirror(state)
      await mirror.join()
      store.setUIprops({showMenu:false})
      dialog.hide()
      await store.mirrorList.setActiveMirror(mirror.hash)
  }
  export const open = ()=> {
      // mirrorEditor.reset()
      dialog.show()
  }
  let mirrorEditor

</script>
<sl-dialog bind:this={dialog} label="New View"
  on:sl-initial-focus={(e)=>{
      mirrorEditor.initialFocus()
      e.preventDefault()
  }}
  on:sl-request-close={(event)=>{
      if (event.detail.source === 'overlay') {
      event.preventDefault();    
}}}>

<div class='mirror-editor'>
  <sl-input class='textarea' placeholder="test" maxlength="60" bind:this={nameInput} on:input={e => name= e.target.value}></sl-input>
  <!-- <BoardSelect /> -->
  <div class="variables">
    {#each variables as variable, i}
      <div class="variable">
        <input class='textarea' placeholder="variable name" maxlength="60" bind:value={variable.name} on:input={() => variables[i] = variable}/>
        {#if variable.value}
          {JSON.stringify(cellValues[i])}
        {/if}
        <button
          on:click={async ()=>{
            const wal = await store.weClient.userSelectWal()
            // TODO: check if wal is a datatub cell or summary
            switch (wal?.context?.assetType) {

              case "Cell":
                const valueOfCell = await getValueOfCell(wal.hrl[1], wal.context?.cellId?.rowId, wal.context?.cellId?.columnId, store)
                variables[i].value = weaveUrlFromWal(wal)
                cellValues[i] = valueOfCell
                break
              case "Column Summary":
                const valueOfSummary = await getValueOfColumnSummary(wal.hrl[1], wal.context?.columnId, wal.context?.sumType, store, "true")
                console.log(valueOfSummary)
                variables[i].value = weaveUrlFromWal(wal)
                cellValues[i] = valueOfSummary
                break
              case "Table":
                console.log("table")
                const tableValues = await getTableValues(wal.hrl[1], store)
                console.log(tableValues)
                variables[i].value = weaveUrlFromWal(wal)
                cellValues[i] = tableValues
                break
              case "Row":
                console.log("row")
                const rowValues = await getRowValues(wal.hrl[1], wal.context?.rowId, store)
                console.log(rowValues)
                variables[i].value = weaveUrlFromWal(wal)
                cellValues[i] = rowValues
                break
              case "Column":
                console.log("column")
                const columnValues = await getColumnValues(wal.hrl[1], wal.context?.columnId, store)
                console.log(columnValues)
                variables[i].value = weaveUrlFromWal(wal)
                cellValues[i] = columnValues
                break
            }
          }}
        >Assign WAL</button>
        <button on:click={() => variables = variables.filter((v, j) => j !== i)}>Remove</button>
      </div>
    {/each}
  </div>
  <button on:click={() => variables = [...variables, {name: "", value: ""}]}>Add Variable</button>
  
  <textarea
    style="width: 100%; height: 100px; resize: none; border: 1px solid #ccc; padding: 5px; margin-top: 5px;"
    bind:value={raw} on:input={e => raw= e.target.value}></textarea>

  <button on:click={()=>{
    addMirror(name, variables, raw)
  }}
   >Save</button>
</div>
  <!-- <MirrorEditor bind:this={mirrorEditor}  handleSave={addMirror} cancelEdit={()=>dialog.hide()} /> -->
</sl-dialog>