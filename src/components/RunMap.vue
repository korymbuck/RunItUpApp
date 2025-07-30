<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { GoogleMap } from "@capacitor/google-maps";

const props = defineProps({
  route: {
    type: Array,
    required: true,
  },
});

const mapRef = ref(null);
let map = null;

// This function runs once when the component is created.
onMounted(async () => {
  if (!mapRef.value || !props.route || props.route.length === 0) {
    return;
  }

  try {
    map = await GoogleMap.create({
      id: "run-map-" + Date.now(), // Unique ID for each map instance
      element: mapRef.value,
      apiKey: "AIzaSyCH2eT6rpZ9FcGnSwRm0G7bg8w-8cXRGmw", // Paste your key here
      config: {
        center: { lat: props.route[0].lat, lng: props.route[0].lng },
        zoom: 16,
        disableDefaultUI: true,
      },
    });

    await map.addPolyline({
      path: props.route,
      strokeColor: "#3B82F6",
      strokeWeight: 5,
    });

    await map.moveCamera({
      target: props.route,
      padding: 40,
    });
  } catch (error) {
    console.error("Error creating Google Map:", error);
  }
});

// This function runs when the component is destroyed (when the modal closes).
onUnmounted(async () => {
  if (map) {
    await map.destroy();
  }
});
</script>

<template>
  <capacitor-google-map
    ref="mapRef"
    style="display: block; height: 300px; width: 100%; border-radius: 10px"
  ></capacitor-google-map>
</template>
