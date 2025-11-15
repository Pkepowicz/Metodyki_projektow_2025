import { SectionList, Text } from "react-native";

import { listStyles } from "@/styles/home";


type PasswordsListProps = {
  passwords: Array<{ title: string; data: string[] }>
}

export default function PasswordsList({passwords}: PasswordsListProps) {
  return (
    <SectionList
      sections={passwords}
      renderItem={({item}) => <Text style={listStyles.item}>{item}</Text>}
      renderSectionHeader={({section}) => (
        <Text style={listStyles.sectionHeader}>{section.title}</Text>
      )}
      keyExtractor={(item, index) => item + index}
    />
  )
}