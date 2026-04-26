import { View, Text, Pressable, StyleSheet } from 'react-native'
import React from 'react'
import { Ionicons } from '@expo/vector-icons';

type props = {
    label: string;
    onPress: () => void;
    icon?: keyof typeof Ionicons.glyphMap;
    primary?: boolean;
}

const ButtonWithRightIcon = ({ label, onPress, icon, primary }: props) => {
    if (primary) {
        return (
            <Pressable onPress={onPress} style={[styles.button, { backgroundColor: "#135BEC" }]}>
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>{label}</Text>
                <Ionicons name={icon} size={24} color="#fff" />
            </Pressable>
        )
    }
    return (
        <Pressable onPress={onPress} style={[styles.button, { backgroundColor: "#F6F6F8" }]}>
            <Text style={{ color: "#334155", fontSize: 16, fontWeight: "bold" }}>{label}</Text>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    button: {
        padding: 10,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 10,
        width: 340,
        height: 60,
        borderWidth: 2,
        borderColor: "#E2E8F0"
    }
})

export default ButtonWithRightIcon