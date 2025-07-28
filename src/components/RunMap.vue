<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { GoogleMap } from "@capacitor/google-maps";

const props = defineProps({
  route: {
    type: Array,
    required: true,
  },
});

const mapRef = ref(null);
let map = null;
const mapId = "run-map-" + Date.now(); // Create a unique ID for the map

// This function now only handles drawing the path and moving the camera
async function updateMapWithPath(path) {
  if (!map || !path || path.length === 0) return;

  try {
    await map.addPolyline({
      path: path,
      strokeColor: "#3B82F6",
      strokeWeight: 5,
    });

    await map.moveCamera({
      target: path,
      padding: 40,
    });
  } catch (error) {
    console.error("Error updating map path:", error);
  }
}

// Create the map only ONCE when the component is first mounted
onMounted(async () => {
  if (!mapRef.value) return;
  try {
    map = await GoogleMap.create({
      id: mapId,
      element: mapRef.value,
      apiKey: "AIzaSyCH2eT6rpZ9FcGnSwRm0G7bg8w-8cXRGmw", // Paste your key here
      config: {
        center: { lat: 34.0522, lng: -118.2437 }, // Default center
        zoom: 8,
        disableDefaultUI: true,
      },
    });

    // If route data is already present when the map is created, draw the path
    if (props.route && props.route.length > 0) {
      await updateMapWithPath(props.route);
    }
  } catch (error) {
    console.error("Error creating Google Map:", error);
  }
});

// Destroy the map instance when the component is removed to prevent memory leaks
onUnmounted(async () => {
  if (map) {
    await map.destroy();
  }
});

// Watch for changes to the route and simply redraw the path on the existing map
watch(
  () => props.route,
  (newRoute) => {
    updateMapWithPath(newRoute);
  }
);
</script>

<template>
  <capacitor-google-map
    :id="mapId"
    ref="mapRef"
    style="display: block; height: 300px; width: 100%; border-radius: 10px"
  ></capacitor-google-map>
</template>
