<script lang="ts">
    import MirrorPane from './MirrorPane.svelte'
    import { TablesStore } from './store'
    import { setContext } from 'svelte';
    import type { AppClient, EntryHash } from '@holochain/client';
    import type { SynStore } from '@holochain-syn/store';
    import type { ProfilesStore } from "@holochain-open-dev/profiles";
    import type { WeClient } from '@lightningrodlabs/we-applet';
    import { onMount } from 'svelte';

    export let roleName = ""
    export let client : AppClient
    export let weClient : WeClient
    export let profilesStore : ProfilesStore
    export let mirror : EntryHash

    let store: TablesStore = new TablesStore (
      weClient,
      profilesStore,
      client,
      roleName,
    );
    let synStore: SynStore = store.synStore
    store.mirrorList.setActiveMirror(mirror)
    $: activeMirrorHash = store.mirrorList.activeMirrorHash
    $: activeMirror = store.mirrorList.activeMirror
    $: state = $activeMirror ? $activeMirror.readableState() : undefined

    onMount(async () => {
      console.log("Setting active mirror to: ", mirror)
      store.mirrorList.setActiveMirror(mirror)
    })

    setContext('synStore', {
      getStore: () => synStore,
    });

    setContext('store', {
      getStore: () => store,
    });
    const DEFAULT_KD_BG_IMG = "none"
    //const DEFAULT_KD_BG_IMG = "https://img.freepik.com/free-photo/studio-background-concept-abstract-empty-light-gradient-purple-studio-room-background-product-plain-studio-background_1258-54461.jpg"
    const NO_BOARD_IMG = "none"

    $: bgUrl = DEFAULT_KD_BG_IMG  // FIXME$activeMirror ?   ($activeMirror.state.props && $mirrorState.props.bgUrl) ? $mirrorState.props.bgUrl : DEFAULT_KD_BG_IMG
  </script>
  {#if state}
  <div class="flex-scrollable-parent">
    <div class="flex-scrollable-container">
      <div class='app'>

      <div class="wrapper">

      <div class="workspace" style="display:flex">


        {#if $activeMirrorHash !== undefined}
          <MirrorPane activeMirror={$activeMirror} showSettings={false}/>
        {:else}
          Unable to find mirror.
        {/if}
        </div>
        </div>
    </div>
  </div>
</div>
{/if}
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

  .wrapper {
    background-color: #ffffff;
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
