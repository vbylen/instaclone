import "react-native-url-polyfill/auto";
import "react-native-get-random-values";

import messaging from "@react-native-firebase/messaging";
import {AppRegistry} from "react-native";

import {name as appName} from "./app.json";
import App from "./src/app/App";

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log("Message handled in the background!", remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);
