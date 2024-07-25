<script lang="ts">
  import { onMount } from 'svelte';
  // import { WcCodeMirror } from "@vanillawc/wc-codemirror";

  // onMount(async () => {
  //   // Dynamically import the wc-code module
  //   await import('https://cdn.jsdelivr.net/gh/vanillawc/wc-code@1.0.3/src/wc-code.js');
  // });

  // import {onMount} from "svelte"
  import CodeMirror from "svelte-codemirror-editor";
  import {basicSetup, EditorView} from "codemirror"
  import {javascript} from "@codemirror/lang-javascript"

  let value;
  // let talk: HTMLElement;

  // onMount(() => {
  //   new EditorView({
  //     doc: "console.log('hello')\n",
  //     extensions: [basicSetup, javascript()],
  //     parent: document.getElementById("asdfff")
  //   });
  // });

</script>

<!-- <div id="asdfff"></div> -->
 
  <!-- <wc-code mode="javascript">
    <script type="wc-content">
      
      console.log(text);
    </script>
  </wc-code>     -->

  <CodeMirror bind:value lang={javascript()} />