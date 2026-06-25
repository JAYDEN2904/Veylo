import React from 'react';
import { View, Text } from 'react-native';
import { Screen, Typography, Button } from '../../components/common';

export const LogoutModal = ({ navigation }: any) => {
  return (
    <Screen className="p-4 justify-center items-center">
      <Typography variant="header" className="mb-4">
        Logout Modal
      </Typography>
      <Typography className="mb-8 text-center text-gray-500">
        This is the Logout Modal implementation.
      </Typography>
      <Button title="Go Back" onPress={() => navigation.goBack()} variant="outline" />
    </Screen>
  );
};
