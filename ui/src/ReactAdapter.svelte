<script>
  import React from "react";
  import ReactDOM from "react-dom";
  import { onDestroy, onMount } from "svelte";

  const e = React.createElement;
  let container;

  onMount(() => {
    const { el, children, class: _, ...props } = $$props;
    try {
      ReactDOM.render(e(el, props, children), container);
    } catch (err) {
      console.warn(`react-adapter failed to mount.`, { err });
    }
  });

  onDestroy(() => {
    try {
      ReactDOM.unmountComponentAtNode(container);
    } catch (err) {
      console.warn(`react-adapter failed to unmount.`, { err });
    }
  });
</script>

<div bind:this={container} class={$$props.class} />

<style>
  :global(.ruleGroup) {
    background-color: #b789327b;
    border-color: #b78932db;
    width: fit-content;
    border-radius: 0;
    /* border: 0; */
    margin: 12px;
    margin-top: 6px;
  }

  :global(.ruleGroup select, .ruleGroup button, .ruleGroup input) {
    background-color: #986526;
    border: 1px solid #b78932db;
    color: #ffffffca;
    padding: 2px 4px;
    font-weight: bold;
  }

  :global(.ruleGroup select:hover, .ruleGroup button:hover, .ruleGroup input:focus) {
    background-color: #c27b24;
  }
</style>