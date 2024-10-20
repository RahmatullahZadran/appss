import AsyncStorage from '@react-native-async-storage/async-storage';

// Function to save viewed profile to AsyncStorage
export const saveViewedProfile = async (instructor) => {
  try {
    const storedProfiles = await AsyncStorage.getItem('viewedProfiles');
    const viewedProfiles = storedProfiles ? JSON.parse(storedProfiles) : [];

    // Check if the profile is already in the list to avoid duplicates
    const profileExists = viewedProfiles.find(profile => profile.id === instructor.id);

    if (!profileExists) {
      // Add the new profile to the start of the array
      viewedProfiles.unshift({
        id: instructor.id,
        firstName: instructor.firstName,
        lastName: instructor.lastName,
        phone: instructor.phone,
        email: instructor.email,
        whatsapp: instructor.whatsapp,
        profileImage: instructor.profileImage,
        price: instructor.price,
        activePlan: instructor.activePlan,
        viewedAt: new Date().toISOString(), // Store as a timestamp
        studentsCount: instructor.studentsCount,
        commentsCount: instructor.commentsCount,
        rating: instructor.rating,
         totalVotes: instructor.totalVotes


      });

      // Keep only the last 15 profiles
      const limitedProfiles = viewedProfiles.slice(0, 15);

      // Save the updated array back to AsyncStorage
      await AsyncStorage.setItem('viewedProfiles', JSON.stringify(limitedProfiles));
    }
  } catch (error) {
    console.error('Error saving viewed profile:', error);
  }
};

// Function to retrieve the last 15 viewed profiles from AsyncStorage
export const getViewedProfiles = async () => {
  try {
    const storedProfiles = await AsyncStorage.getItem('viewedProfiles');
    return storedProfiles ? JSON.parse(storedProfiles) : [];
  } catch (error) {
    console.error('Error fetching viewed profiles:', error);
    return [];
  }
};
