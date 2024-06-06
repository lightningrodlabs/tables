<script lang="ts">
    import Toolbar from './Toolbar.svelte'
    import TablePane from './TablePane.svelte'
    import { TablesStore } from './store'
    import { setContext } from 'svelte';
    import type { AppAgentClient } from '@holochain/client';
    import type { SynStore } from '@holochain-syn/store';
    import type { ProfilesStore } from "@holochain-open-dev/profiles";
    import type { WeClient } from '@lightningrodlabs/we-applet';
    import NewBoardDialog from './NewBoardDialog.svelte';
    import SvgIcon from "./SvgIcon.svelte";
    import BoardMenu from "./BoardMenu.svelte";
    import MirrorMenu from "./MirrorMenu.svelte";
    import NewMirrorDialog from './NewMirrorDialog.svelte';
    import MirrorPane from './MirrorPane.svelte'

    export let roleName = ""
    export let client : AppAgentClient
    export let weClient : WeClient
    export let profilesStore : ProfilesStore

    let store: TablesStore = new TablesStore (
      weClient,
      profilesStore,
      client,
      roleName,
    );
    let synStore: SynStore = store.synStore

    $: activeBoardHash = store.boardList.activeBoardHash
    $: activeMirrorHash = store.mirrorList.activeMirrorHash
    $: activeBoard = store.boardList.activeBoard
    $: activeMirror = store.mirrorList.activeMirror

    setContext('synStore', {
      getStore: () => synStore,
    });

    setContext('store', {
      getStore: () => store,
    });
    const DEFAULT_KD_BG_IMG = "none"
    //const DEFAULT_KD_BG_IMG = "https://img.freepik.com/free-photo/studio-background-concept-abstract-empty-light-gradient-purple-studio-room-background-product-plain-studio-background_1258-54461.jpg"
    const NO_BOARD_IMG = "none"
    $: uiProps = store.uiProps
    $: boardCount = store.boardList.boardCount

    $: bgUrl = DEFAULT_KD_BG_IMG  // FIXME$activeBoard ?   ($activeBoard.state.props && $boardState.props.bgUrl) ? $boardState.props.bgUrl : DEFAULT_KD_BG_IMG
    $: bgImage = `background-image: url("`+ bgUrl+`");`
    let newBoardDialog
    let newMirrorDialog

  </script>
      <NewBoardDialog bind:this={newBoardDialog}></NewBoardDialog>
      <NewMirrorDialog bind:this={newMirrorDialog}></NewMirrorDialog>

  <div class="flex-scrollable-parent">
    <div class="flex-scrollable-container">
      <div class='app'>

      <div class="wrapper">

      <div class="header">
        <Toolbar
          profilesStore={profilesStore}/>
      </div>
      <div class="workspace" style="display:flex;">

        {#if $activeBoardHash !== undefined}
          <TablePane activeBoard={$activeBoard}/>
        {:else if $activeMirrorHash !== undefined}
          <MirrorPane activeMirror={$activeMirror}/>
        {:else}
          <div style="margin:20px;">
            <div style="display:flex; flex-wrap:wrap;">
            <div class="new-board" on:click={()=>newBoardDialog.open()} title="New Table"><SvgIcon color="#fff" size=25px icon=faSquarePlus /><span style="margin-left:10px; color:rgb(255 255 255 / 74%);">New Table</span></div>
            <div class="new-board" on:click={()=>newMirrorDialog.open()} title="New View"><SvgIcon color="#fff" size=25px icon=faSquarePlus /><span style="margin-left:10px; color:rgb(255 255 255 / 74%);">New View</span></div>
            </div>

            <BoardMenu mainpage={true} />
            <MirrorMenu mainpage={true} />
            
          </div>
        {/if}
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
    /* background-color: #fff; */
    /* background-image: url('/datatub.png'); */
    /* background-color: #ac7c3f; */
    background-color: #d7ddde;
    /* make background image vertically centered */
    background-position: center;
    height: 100vh;
    position: relative;
    overflow: auto;
  }

  .new-board {
    margin-left:10px;
    padding:5px;
    box-sizing: border-box;
    position: relative;
    width: 160px;
    height: 35px;
    /* background: rgba(24, 55, 122, 1.0);
    border: 1px solid #4A559D; */
    background: #b0b0b0;
    border: 1px solid #727272;
    color: #fff;
    display: flex;
    align-items: center;
    border-radius: 5px;
    font-size: 16px;
    font-weight: bold;
    transition: all .25s ease;
    top: 3px;
    padding: 15px 4px;
    box-shadow: 0px 4px 8px rgba(35, 32, 74, 0);
  }

  .new-board:hover {
    cursor: pointer;
    padding: 10px 5px;
    width: 180px;
    /* border: 1px solid #252d5d; */
    /* background: rgb(10, 25, 57); */
    border: 1px solid #4e4e4e;
    background: #909090;
    /* margin: 0 -5px 0 -5px; */
    margin: 0px -5px -7px 0px;
    box-shadow: 0px 4px 15px rgba(35, 32, 74, 0.8);
  }
  @keyframes slideIn {
      from {
          margin-left: var(--margin-start-position);
          backdrop-filter: blur(10px);
      }

      to {
          margin-left: var(--margin-end-position);
          backdrop-filter: blur(0px);
      }
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

  .loading {
    text-align: center;
    padding-top: 100px;
  }
  .loader {
    border: 8px solid #f3f3f3;
    border-radius: 50%;
    border-top: 8px solid #3498db;
    width: 50px;
    height: 50px;
    -webkit-animation: spin 2s linear infinite; /* Safari */
    animation: spin 2s linear infinite;
    display: inline-block;
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

  /* .my-boards {
    display: flex;
  }
  .my-board {
    border-radius: 5px;
    border: 1px solid #222;
    background-color: lightcyan;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100px;
    width: 100px;
    margin: 5px;
  } */
</style>
