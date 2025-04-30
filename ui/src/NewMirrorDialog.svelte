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
  import { weaveUrlFromWal, weaveUrlToWAL } from '@theweave/api';
  import {basicSetup, EditorView} from "codemirror"
  import {javascript} from "@codemirror/lang-javascript"
  import CodeMirror from './CodeMirror.svelte';

  // new EditorView({
  //   doc: "console.log('hello')\n",
  //   extensions: [basicSetup, javascript()],
  //   parent: document.getElementById("codeEditor")
  // })

  let editLabelDefs = []
  let editColumnDefs = []
  let dialog: SlDialog
  let nameInput;
  let cellValues = {}
  let variables = []
  let previousVariables = [];

  $: variables;
  $: name = "Untitled"
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
  <input class='title' placeholder="Enter view title" maxlength="60" bind:this={nameInput} value={name} on:input={e => name= e.target.value} />
  <!-- <BoardSelect /> -->
  <div class="variables">
    {#each variables as variable, i}
      <div class="variable">
        <input class='textarea' placeholder="variable name" maxlength="60" bind:value={variable.name} on:input={() => variables[i] = variable}/>
        <button
          class="assign-wal"
          on:click={async ()=>{
            const wal = await store.weClient.assets.userSelectAsset()
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
        <button
          class="remove-var"
          on:click={() => {
            variables = variables.filter((v, j) => j !== i)
            // cellValues = cellValues.filter((v, j) => j !== i)
          }}
        >Remove</button>
        {#if variable.value}
          <div
            style="width: 100%; resize: none; border: 1px solid #ccc; padding: 5px; margin-top: 5px;"
          >
            {JSON.stringify(cellValues[i])}
          </div>
        {/if}
      </div>
    {/each}
  </div>
  <button class="add-var" on:click={() => variables = [...variables, {name: "var_" + (variables.length + 1), value: ""}]}>Add Variable</button>
  
  <textarea
    placeholder="Enter raw html/css/javascript, with variables formatted like {'!weave{var_1}'}"
    style="width: 100%; height: 100px; resize: none; border: 1px solid #ccc; padding: 5px; margin-top: 5px;"
    bind:value={raw} on:input={e => raw= e.target.value}></textarea>

  <!-- <div id="codeEditor"></div> -->

  <!-- <CodeMirror /> -->
    
  <button 
  class="save"
  on:click={()=>{
    addMirror(name, variables, raw)
  }}
   >Save</button>
</div>

<CodeMirror />
  <!-- <MirrorEditor bind:this={mirrorEditor}  handleSave={addMirror} cancelEdit={()=>dialog.hide()} /> -->
</sl-dialog>

<style>
  #codeEditor {
    all:initial;
    display: inline-block;
    width: 100%;
    background: white;
  }

  input.title {
    width: 100%;
    height: 30px;
    border: 1px solid #ccc;
    padding: 5px;
    background-color: #fff;
  }

  button.add-var {
    background-color: #af4c9d;
    color: white;
    padding: 10px 20px;
    border: none;
    cursor: pointer;
    margin-top: 10px;
    margin-bottom: 6px;
  }

  button.add-var:hover {
    background-color: #9b3a7a;
  }

  button.remove-var {
    background-color: #ff4c4c;
    color: white;
    padding: 5px 10px;
    border: none;
    cursor: pointer;
    margin-left: 10px;
  }
  button.remove-var:hover {
    background-color: #d43f3f;
  }
  button.assign-wal {
    background-color: #4caf50;
    color: white;
    padding: 5px 10px;
    border: none;
    cursor: pointer;
    margin-left: 10px;
  }
  button.assign-wal:hover {
    background-color: #45a049;
  }
  .variables {
    display: flex;
    flex-direction: column;
    margin-top: 10px;
  }
  .variable {
    border: 1px solid #ccc;
    padding: 5px;
    background-color: white;
  }
  button.save {
    background-color: #4caf50;
    color: white;
    padding: 10px 20px;
    border: none;
    cursor: pointer;
    margin-top: 6px;
  }
</style>