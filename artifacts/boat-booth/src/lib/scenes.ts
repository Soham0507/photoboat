// Scene background images, keyed by scene id — shared by create.tsx (shown
// while picking a scene) and the offline compositor (used as the backdrop
// the guest's cutout gets placed onto).
import pontoonImg from "@assets/pontoon_wi.jpg_1780096222900.jpeg";
import wakeImg from "@assets/wakesurfing.jpg_1780096222900.jpeg";
import bassImg from "@assets/bass_fishing.jpg_1780096222901.jpeg";
import boatCruisingImg from "@assets/boat_cruising.png";
import jetSkiingImg from "@assets/jet_skiing.png";
import trophyCatchImg from "@assets/trophy_catch.png";

export const SCENE_IMAGES: Record<string, string> = {
  "pontoon-sunset": pontoonImg,
  "wakesurfing": wakeImg,
  "bass-fishing": bassImg,
  "boat-cruising": boatCruisingImg,
  "jet-skiing": jetSkiingImg,
  "trophy-catch": trophyCatchImg,
};
