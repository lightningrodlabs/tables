<script lang="ts">
  // import MirrorEditor from './MirrorEditor.svelte';
  import type { TablesStore } from './store';
  import { getContext } from 'svelte';
  import type { Variable, MirrorState } from './mirror';
  import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
  import '@shoelace-style/shoelace/dist/components/button/button.js';
  import '@shoelace-style/shoelace/dist/components/input/input.js';
  import type SlDialog from '@shoelace-style/shoelace/dist/components/dialog/dialog';
  import SelectRowAndValue from './SelectRowAndValue.svelte';
  import BoardSelect from './BoardSelect.svelte';

  let editLabelDefs = []
  let editColumnDefs = []
  let dialog: SlDialog
  let nameInput;
  $: name = ""
  $: raw = ""
  $: variables = []
  $: boardHash = ""
  
  const { getStore } :any = getContext('store');

  const store:TablesStore = getStore();

  const addMirror = async (name: string, variables: Array<Variable>, raw: string ) => {
      const state:Partial<MirrorState> = {name, variables, raw}
      console.log("state", state)
      state.feed = {}
      // state.feed[newFeedKey(store.myAgentPubKeyB64)] = {delta:{type:"create", name}, context:null}
      const mirror = await store.mirrorList.makeMirror(state)
      console.log("mirror", mirror)
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
<sl-dialog bind:this={dialog} label="New Mirror"
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
  <!-- {JSON.stringify($activeBoards)} -->
  <BoardSelect />
  <!-- as many variables as wanted -->
  <div class="variables">
    {#each variables as variable, i}
      <div class="variable">
        <input class='textarea' placeholder="variable name" maxlength="60" bind:value={variable.name} on:input={() => variables[i] = variable}/>
        <!-- select boardhash from boards -->
        <!-- <select bind:value={boardHash} on:change={() => variables[i].boardHash = boardHash}>
          {#each $activeBoards.value as boardHash}
            <option value={boardHash}>{store.mirrorList.mirrorData2.get(boardHash).value?.latestState?.name}</option>
          {/each}
        </select> -->
      
        <!--   export let boardHash: EntryHash;
  export let keyColumn;
  export let displayColumn;
  export let selectedRow = null -->
        
        <!-- <SelectRowAndValue {boardHash} /> -->
        <!-- <input class='textarea' placeholder="variable value" maxlength="60" bind:value={variable.value} on:input={() => variables[i] = variable}/> -->
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