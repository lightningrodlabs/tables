<script lang="ts">
 
  import Avatar from "./Avatar.svelte";
  import type { Board } from "./board";

  export let board: Board
  export let max = 5
  $: participants = board ? board.sessionParticipants() : undefined

  export let size:number = 24;

</script>
<div class="wrapper"
    class:bordered={false}  >
    {#if $participants && $participants.status=="complete"}
    {@const folks = Array.from($participants.value).slice(0,max)}
    {@const extra = $participants.value.length - folks.length}
      {#each folks as agentPubKey}
        <Avatar size={size} agentPubKey={agentPubKey} showNickname={false} />
      {/each}
      {#if extra != 0}
        <div style="font-size: 12px; height: 10px; padding: 4px">
          + {extra} more
        </div>
      {/if}
    {/if}
</div>
<style>
  .bordered {
    border: solid 1px gray;
  }
  .wrapper {
    border-radius: 50%;
    display: flex;
    flex-direction: row
  }
</style>