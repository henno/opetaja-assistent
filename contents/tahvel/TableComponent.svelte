<script lang="ts">
    export let journalId: string | null = null;
  
    import { onMount } from 'svelte';
    
    onMount(() => {
      console.log(`Component mounted with journalId: ${journalId}`);
      // Your JavaScript to run when the component mounts
    });
  </script>
  
  {#if journalId}
  <span style="border-radius: 4px; color: white; background-color: red; padding: 4px; margin-left: 5px;">
    !!!
  </span>
  {/if}
  