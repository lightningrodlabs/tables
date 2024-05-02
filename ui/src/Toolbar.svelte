<script lang="ts">
  import Folk from "./Folk.svelte";
  import type { ProfilesStore } from "@holochain-open-dev/profiles";
  import Search from './Search.svelte';
  import { getContext } from "svelte";
  import type { TablesStore } from "./store";
  import SvgIcon from "./SvgIcon.svelte";
  import BoardMenu from "./BoardMenu.svelte";
  import BoardMenuItem from "./BoardMenuItem.svelte";
    import { BoardType } from "./boardList";

  const { getStore } :any = getContext("store");
  let store: TablesStore = getStore();

  $: uiProps = store.uiProps
  $: activeHash = store.boardList.activeBoardHash;
  $: activeBoard = store.boardList.activeBoard;


  export let profilesStore: ProfilesStore|undefined

</script>

<div class='toolbar'>
  <div class="items">
    <!-- <BoardMenu></BoardMenu> -->
    <h1 style="margin-left: 20px; font-size: 24px; font-family:math; font-style: oblique;
    letter-spacing: 4px;">data⊈tub</h1>
    <!-- {#if $activeHash}
    <div style="margin-left: 20px;">
      <BoardMenuItem boardType={BoardType.archived} boardHash={$activeHash} />
    </div>
    {/if} -->
  </div>
  <div class="items"><Search></Search></div>
  <div class="items">
    <Folk></Folk>
    <a href="https://github.com/lightningrodlabs/tables/issues" title="Report a problem in our GitHub repo" target="_blank">
      <div class="nav-button"><SvgIcon color="#fff" icon="faBug" size=20px /></div>
    </a>
  </div>
</div>

<style>
  .board-name {
    font-size: 20px;
  }

  .bug-link {
    padding: 8px 8px;
    display: flex;
    border-radius: 50%;
  }
  a:hover.bug-link {
    background-color: #ddd;
  }
  .toolbar {
    background: linear-gradient(90.1deg, rgb(101 62 14) 0%, rgb(118, 75, 26) 100%);
    align-items: center;
    justify-content: space-between;
    color: #fff;
    height: 50px;
    position: relative;
    z-index: 250;
    display: flex;
  }

  .close, .open {
    color: #fff;
    margin-left: 15px;
    width: 30px;
    height: 30px;
  }
  
  .open {
    margin-left: 10px;
  }

  .items {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
  }
  
</style>