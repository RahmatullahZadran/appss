import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { auth, firestore } from '../firebase';  // Firebase config
import { doc, getDoc } from 'firebase/firestore';
import StudentProfile from './student';
import InstructorProfile from './instructo';

const ProfileScreen = () => {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('');
  const [profileData, setProfileData] = useState({});

  useEffect(() => {
    const fetchProfileData = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const docRef = doc(firestore, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setRole(data.role || '');  // Student or Instructor
          setProfileData(data);
        }

        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  // Conditional rendering based on role
  return role === 'student' ? (
    <StudentProfile firstName={profileData.firstName} lastName={profileData.lastName} />
  ) : role === 'instructor' ? (
    <InstructorProfile
      firstName={profileData.firstName}
      lastName={profileData.lastName}
      phone={profileData.phone}
      email={profileData.email}
      whatsapp={profileData.whatsapp}
      postcode={profileData.postcode}
      activePlan={profileData.activePlan}
      userId={auth.currentUser.uid}
    />
  ) : null;
};

export default ProfileScreen;
