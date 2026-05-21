import React from "react";
import { View } from "react-native";
import { SvgUri } from "react-native-svg";
import { Asset } from "expo-asset";

const logoAsset = Asset.fromModule(require("../../assets/images/logo.svg"));

export const Logo = ({ size = 120, style }) => {
  const logoWidth = Math.round(size * 2.5);

  return (
    <View
      style={[
        {
          justifyContent: "center",
          alignItems: "center",
          width: logoWidth,
          height: size,
          overflow: "visible",
        },
        style,
      ]}
    >
      <SvgUri
        width={logoWidth}
        height={size}
        uri={logoAsset.uri}
        preserveAspectRatio="xMinYMid meet"
      />
    </View>
  );
};
