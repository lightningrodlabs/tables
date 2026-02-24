<script lang="ts">
 
  import Avatar from "./Avatar.svelte";
  import type { Board } from "./board";

  export let board: Board
  export let max = 5
  $: participants = board ? board.sessionParticipants() : undefined

  export let size:number = 24;

  // Track stable values to prevent re-renders when participants are the same
  let stableParticipantList: any[] = [];
  let stableExtra: number = 0;
  
  $: if ($participants && $participants.status === "complete") {
    const currentList = Array.from($participants.value);
    // Only update if the participant count or members have actually changed
    if (currentList.length !== stableParticipantList.length || 
        !currentList.every((p, i) => p === stableParticipantList[i])) {
      stableParticipantList = currentList.slice(0, max);
      stableExtra = currentList.length - stableParticipantList.length;
    }
  }

</script>
<div class="wrapper"
    class:bordered={false}  >
    {#if $participants && $participants.status=="complete"}
      {#each stableParticipantList as agentPubKey (agentPubKey)}
        <Avatar size={size} agentPubKey={agentPubKey} showNickname={false} />
      {/each}
      {#if stableExtra > 0}
        <div style="font-size: 12px; height: 10px; padding: 4px; white-space: nowrap;">
          + {stableExtra} more
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