import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, LogIn } from 'lucide-react-native';
import { apiClient } from '../../api/apiClient';
import { useAuthStore } from '../../store/authStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);
    try {
      // 1. Obtener tokens JWT
      const res = await apiClient.post('/auth/login/', { email, password });
      const { access, refresh } = res.data;

      // 2. Guardar token temporalmente en el store para la siguiente petición
      useAuthStore.setState({ token: access });

      // 3. Obtener el perfil del usuario para saber su rol
      const profileRes = await apiClient.get('/auth/profile/');
      const user = profileRes.data;

      // 4. Guardar todo en Zustand de manera persistente
      setAuth(access, refresh, user);
      
    } catch (error: any) {
      console.log('Login error:', error.response?.data || error.message);
      Alert.alert('Error', 'Credenciales incorrectas o error de conexión.');
      useAuthStore.getState().logout();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <View className="flex-1 justify-center px-8">
        <View className="items-center mb-10">
          {/* Aquí iría el logo si se añade una imagen local, por ahora texto */}
          <Text className="text-4xl font-extrabold text-white tracking-widest">
            SCW <Text className="text-red-600">DOJO</Text>
          </Text>
          <Text className="text-zinc-400 mt-2 text-center uppercase tracking-wider text-xs font-bold">
            Portal de Acceso Exclusivo
          </Text>
        </View>

        <View className="space-y-6">
          <View>
            <Text className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2 ml-1">
              Correo Electrónico
            </Text>
            <View className="flex-row items-center bg-zinc-900 border border-white/10 rounded-xl px-4 py-1 h-14">
              <Mail color="#9CA3AF" size={20} />
              <TextInput
                className="flex-1 text-white ml-3 font-semibold"
                placeholder="ejemplo@correo.com"
                placeholderTextColor="#52525B"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View>
            <Text className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2 ml-1">
              Contraseña
            </Text>
            <View className="flex-row items-center bg-zinc-900 border border-white/10 rounded-xl px-4 py-1 h-14">
              <Lock color="#9CA3AF" size={20} />
              <TextInput
                className="flex-1 text-white ml-3 font-semibold"
                placeholder="••••••••••••"
                placeholderTextColor="#52525B"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className="h-14 bg-red-600 rounded-xl flex-row items-center justify-center mt-4 shadow-lg shadow-red-600/30 active:bg-red-700"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <LogIn color="white" size={20} />
                <Text className="text-white font-bold text-sm uppercase tracking-widest ml-2">
                  Entrar al Ring
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
