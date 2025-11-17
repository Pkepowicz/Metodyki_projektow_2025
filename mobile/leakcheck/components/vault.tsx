import { View, Text, ScrollView } from "react-native";

import { PasswordItem, Section } from "@/app/home/vault"


function PasswordCard({item}: {item: PasswordItem}) {
  return (
    <View style={{
      backgroundColor: '#fff',
      padding: 16,
      marginVertical: 8,
      marginHorizontal: 12,
      borderRadius: 12,
      elevation: 3,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowOffset: {width: 0, height: 2},
      shadowRadius: 6
    }}>
      <Text style={{fontSize: 16, fontWeight: 'bold'}}>
        {item.user}
      </Text>

      <Text style={{fontSize: 14, marginTop: 4}}>
        {item.encrypted_password}
      </Text>
    </View>
  )
}

export default function PasswordsList({passwords}: {passwords: Section[]}) {
  return (
    <ScrollView>
      {passwords.map(section => (
        <View key={section.title}>
          <Text style={{
            fontSize: 20,
            fontWeight: 'bold',
            marginTop: 20,
            marginLeft: 12
          }}>
            {section.title}
          </Text>

          {section.data.map((item, index) => (
            <PasswordCard key={index} item={item} />
          ))}
        </View>
      ))}
    </ScrollView>
  )
}
