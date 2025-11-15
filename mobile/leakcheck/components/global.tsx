import { View, Text, Button } from "react-native"

import { homeStyles } from "@/styles/home"


type ErrorMessageProps = {
  error: string;
  retry_function: () => void;
}

export default function ErrorMessage({error, retry_function}: ErrorMessageProps) {
  return (
    <View style={{alignItems: "center"}}>
      <Text style={homeStyles.error}>Error occured: {error}</Text>
      <View style={{width: 100}}>
        <Button title="Try Again" onPress={retry_function} />
      </View>
    </View>
  )
}
