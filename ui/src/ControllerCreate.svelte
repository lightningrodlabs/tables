<script lang="ts">
  import { TablesStore } from './store'
  import { setContext } from 'svelte';
  import type { AppAgentClient } from '@holochain/client';
  import { SynStore } from '@holochain-syn/store';
  import type { ProfilesStore } from "@holochain-open-dev/profiles";
  import type { WeaveClient } from '@lightningrodlabs/we-applet';
  import { SynClient } from '@holochain-syn/core';
  import { getMyDna } from './util';
  import { Board } from './board';

  export let roleName = ""
  export let client : AppAgentClient
  export let weClient : WeaveClient
  export let profilesStore : ProfilesStore
  export let view

  let store: TablesStore = new TablesStore (
    weClient,
    profilesStore,
    client,
    roleName,
  );
  let synStore: SynStore = store.synStore

  setContext('synStore', {
    getStore: () => synStore,
  });

  setContext('store', {
    getStore: () => store,
  });
let inputElement
let disabled = true
</script>
<div class="flex-scrollable-parent">
  <div class="flex-scrollable-container">
    <div class='app'>

    <div class="wrapper">

    <div class="workspace" style="display:flex; flex-direction:column;padding:20px;">
      <sl-input bind:this={inputElement}
        on:sl-input={(e)=>disabled = !e.target.value}
        label="Table Name"></sl-input>
        <div style="margin-top:10px;display:flex;justify-content:flex-end">
          <sl-button 
            style="margin-right:10px;"
            disabled={disabled}
            on:click={async ()=>{
            try {
              const synStore = new SynStore(new SynClient(client, roleName));
              //const hrlB64 = weaveUrlFromWal(attachToWAL)
              const board = await Board.Create(synStore, {/*boundTo:[hrlB64]*/name: inputElement.value})
              const dnaHash = await getMyDna(roleName, client)
              view.resolve({hrl:[dnaHash, board.hash]})
            } catch(e) {
              console.log("ERR",e)
              view.reject(e)
            }
          }}>Create</sl-button>
          <sl-button on:click={()=>{
            view.cancel()
          }}>Cancel</sl-button>
        </div>
      </div>
      </div>
  </div>
</div>
</div>
<style>
.app {
  margin: 0;
  padding-bottom: 10px;
  background-size: cover;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background-color: #fff;
  height: 100vh;
  position: relative;
}

:global(:root) {
  --resizeable-height: 200px;
  --tab-width: 60px;
}

@media (min-width: 640px) {
  .app {
    max-width: none;
  }
}
@-webkit-keyframes spin {
  0% { -webkit-transform: rotate(0deg); }
  100% { -webkit-transform: rotate(360deg); }
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.flex-scrollable-parent {
  position: relative;
  display: flex;
  flex: 1;
}
.flex-scrollable-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.wrapper {
  position: relative;
  z-index: 10;
}

</style>
