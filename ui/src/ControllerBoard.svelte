<script lang="ts">
    import TablePane from './TablePane.svelte'
    import { TablesStore } from './store'
    import { setContext } from 'svelte';
    import type { AppAgentClient, EntryHash } from '@holochain/client';
    import type { SynStore } from '@holochain-syn/store';
    import type { ProfilesStore } from "@holochain-open-dev/profiles";
    import type { WeaveClient } from '@theweave/api';

    export let roleName = ""
    export let client : AppAgentClient
    export let weClient : WeaveClient
    export let profilesStore : ProfilesStore
    export let board : EntryHash

    let store: TablesStore = new TablesStore (
      weClient,
      profilesStore,
      client,
      roleName,
    );
    let synStore: SynStore = store.synStore
    store.boardList.setActiveBoard(board)
    $: activeBoardHash = store.boardList.activeBoardHash
    $: activeBoard = store.boardList.activeBoard

    setContext('synStore', {
      getStore: () => synStore,
    });

    setContext('store', {
      getStore: () => store,
    });
    const DEFAULT_KD_BG_IMG = "none"
    //const DEFAULT_KD_BG_IMG = "https://img.freepik.com/free-photo/studio-background-concept-abstract-empty-light-gradient-purple-studio-room-background-product-plain-studio-background_1258-54461.jpg"
    const NO_BOARD_IMG = "none"

    $: bgUrl = DEFAULT_KD_BG_IMG  // FIXME$activeBoard ?   ($activeBoard.state.props && $boardState.props.bgUrl) ? $boardState.props.bgUrl : DEFAULT_KD_BG_IMG
  </script>
  <div class="flex-scrollable-parent">
    <div class="flex-scrollable-container">
      <div class='app'>

      <div class="wrapper">

      <div class="workspace" style="display:flex; flex:1 1 auto; min-height:0; min-width:0">


        {#if $activeBoardHash !== undefined}
          <TablePane activeBoard={$activeBoard} standAlone={true}/>
        {:else}
          Unable to find board.
        {/if}
        </div>
        </div>
    </div>
  </div>
</div>
<style>
  .app {
    margin: 0;
    background-size: cover;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background-color: #fff;
    /* 100% of .flex-scrollable-container (inset: 0), not of the viewport, and
       no padding-bottom: under the global border-box that came out of the
       content box as a dead strip under the table. */
    height: 100%;
    position: relative;
  }

  .wrapper {
    background-color: #fff;
    /* .wrapper sits between .app and .workspace and was a plain block, so the
       flex chain died here and nothing below it could fill. */
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    /* A flex item defaults to min-width: auto, so it refuses to shrink below its
       content's intrinsic width -- with a wide table inside, .board grew past
       its parent and every ancestor that could scroll showed a bar. This is the
       horizontal half of the min-height: 0 above it. */
    min-height: 0;
    min-width: 0;
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
