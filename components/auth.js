import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, KeyboardAvoidingView, StyleSheet } from 'react-native';
import CheckBox from 'expo-checkbox'; // Using expo-checkbox for Expo projects
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, firestore } from '../firebase';
import { setDoc, doc } from 'firebase/firestore';  // Firestore functions

const AuthScreen = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');  // Used for login and authentication
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');  // Confirm password field
  const [isLogin, setIsLogin] = useState(true);  // Toggle between login/register
  const [role, setRole] = useState('');   // Role selection during registration
  const [agreedToGuidelines, setAgreedToGuidelines] = useState(false); // Community Guidelines
  const [errors, setErrors] = useState({});      // Store validation errors
  const [guidelinesVisible, setGuidelinesVisible] = useState(false);  // To show/hide modal

  // Password validation regex
  const passwordValidation = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;

  // Validate form inputs
  const validateInputs = () => {
    let valid = true;
    let errors = {};

    // Name validation
    if (!firstName && !isLogin) {
      errors.firstName = 'First name is required';
      valid = false;
    }
    if (!lastName && !isLogin) {
      errors.lastName = 'Last name is required';
      valid = false;
    }

    // Role validation
    if (!isLogin && !role) {
      errors.role = 'Please select a role (Student or Instructor)';
      valid = false;
    }

    // Email validation
    if (!email) {
      errors.email = 'Email is required';
      valid = false;
    }

    // Password validation
    if (!passwordValidation.test(password)) {
      errors.password = 'Password must contain at least 8 characters, one uppercase, one lowercase, and one number.';
      valid = false;
    }

    // Confirm password validation (only in register mode)
    if (!isLogin && password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
      valid = false;
    }

    // Community guidelines checkbox validation
    if (!isLogin && !agreedToGuidelines) {
      errors.guidelines = 'You must agree to the community guidelines.';
      valid = false;
    }

    setErrors(errors);
    return valid;
  };

  // Handle Login
  const handleLogin = async () => {
    if (!validateInputs()) return;

    try {
      await signInWithEmailAndPassword(auth, email, password);  // Log the user in
    } catch (error) {
      setErrors((prevErrors) => ({ ...prevErrors, auth: error.message }));
    }
  };

  // Handle Registration (Keep logged in)
  const handleRegister = async () => {
    if (!validateInputs()) return;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save additional user info to Firestore
      await setDoc(doc(firestore, 'users', user.uid), {
        firstName,
        lastName,
        MainEmail: user.email,  // Store login email as MainEmail in Firestore
        role,  // Save role as either student or instructor
      });

    } catch (error) {
      setErrors((prevErrors) => ({ ...prevErrors, auth: error.message }));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{isLogin ? 'Login' : 'Register'}</Text>

        {/* Registration Fields */}
        {!isLogin && (
          <>
            <TextInput
              style={styles.input}
              placeholder="First Name"
              value={firstName}
              onChangeText={setFirstName}
            />
            {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}

            <TextInput
              style={styles.input}
              placeholder="Last Name"
              value={lastName}
              onChangeText={setLastName}
            />
            {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
          </>
        )}

        {/* Email Field */}
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

        {/* Password Field */}
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

        {/* Confirm Password Field (only for registration) */}
        {!isLogin && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

            {/* Community Guidelines Checkbox */}
            <View style={styles.guidelineContainer}>
              <CheckBox
                value={agreedToGuidelines}
                onValueChange={setAgreedToGuidelines}
              />
              <TouchableOpacity onPress={() => setGuidelinesVisible(true)}>
                <Text style={styles.guidelineText}>I agree to the community guidelines</Text>
              </TouchableOpacity>
            </View>
            {errors.guidelines && <Text style={styles.errorText}>{errors.guidelines}</Text>}

            {/* Role Selection */}
            <View style={styles.roleSelection}>
              <Text style={styles.label}>Register as:</Text>
              <View style={styles.roleButtonContainer}>
                <TouchableOpacity
                  style={[styles.roleButton, role === 'student' && styles.selectedRoleButton]}
                  onPress={() => setRole('student')}
                >
                  <Text style={role === 'student' ? styles.selectedRoleText : styles.roleText}>Student</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleButton, role === 'instructor' && styles.selectedRoleButton]}
                  onPress={() => setRole('instructor')}
                >
                  <Text style={role === 'instructor' ? styles.selectedRoleText : styles.roleText}>Instructor</Text>
                </TouchableOpacity>
              </View>
            </View>
            {errors.role && <Text style={styles.errorText}>{errors.role}</Text>}
          </>
        )}

        {/* Authentication Error */}
        {errors.auth && <Text style={styles.errorText}>{errors.auth}</Text>}

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={isLogin ? handleLogin : handleRegister}
        >
          <Text style={styles.submitButtonText}>{isLogin ? 'Login' : 'Register'}</Text>
        </TouchableOpacity>

        {/* Toggle between Login and Register */}
        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.toggleText}>
            {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
          </Text>
        </TouchableOpacity>

        {/* Community Guidelines Modal */}
{/* Community Guidelines Modal */}
<Modal
  visible={guidelinesVisible}
  animationType="slide"
  onRequestClose={() => setGuidelinesVisible(false)}
>
  <View style={styles.modalContainer}>
    <ScrollView>
      <Text style={styles.modalTitle}>Privacy Policy</Text>
      <Text style={styles.guidelineContent}>
        Effective Date: 24/10/2024{'\n\n'}
        
        At EliteDrive Academy, your privacy is of paramount importance to us. This Privacy Policy outlines how we collect, use, disclose, and protect your personal information when you use our services, including our mobile application ("App"). By using the EliteDrive Academy App, you agree to the practices described in this Privacy Policy.{'\n\n'}

        1. Information We Collect{'\n'}
        a. Personal Information{'\n'}
        Instructors: Name, email, phone number, profile picture, location (postcode or GPS), qualifications, subscription status, and other details you provide.{'\n'}
        Students: Name, email, profile picture, location, and interactions with instructors.{'\n\n'}
        
        b. Usage Data{'\n'}
        We collect data about how you interact with the app, such as search queries, feedback, comments, and interactions with instructors or students.{'\n\n'}
        
        c. Location Data{'\n'}
        We collect location data (either postcode or GPS coordinates) to help students find instructors nearby.{'\n\n'}
        
        d. Camera and Photo Access{'\n'}
        Instructors may upload student pictures for administrative purposes. We request camera access to allow direct photo uploads within the app.{'\n\n'}
        
        e. Device Information{'\n'}
        We may collect device-specific information such as the device model, operating system, and other diagnostic data to improve app functionality.{'\n\n'}
        
        2. How We Use Your Information{'\n'}
        We use your personal information to:{'\n'}
        - Manage and create profiles for instructors and students.{'\n'}
        - Enable students to search for instructors by location and instructors to update profiles, upload pictures, and manage student information.{'\n'}
        - Facilitate communication between students and instructors.{'\n'}
        - Provide location-based search results for students.{'\n'}
        - Allow students to rate instructors and leave feedback.{'\n'}
        - Ensure security and prevent fraud.{'\n'}
        - Verify instructor subscription status to allow them to maintain an active account and be visible to nearby students.{'\n\n'}
        
        3. Subscriptions for Instructors{'\n'}
        To maintain an active account and be displayed to nearby students, instructors are required to subscribe to one of our subscription plans:{'\n'}
        - Weekly Subscription: A subscription plan that renews every week.{'\n'}
        - Monthly Subscription: A subscription plan that renews every month.{'\n'}
        Instructors with an active subscription will be shown to students in the app's search results based on their location and preferences. If a subscription is not active, the instructor's profile may not be visible to students.{'\n\n'}
        
        4. Data Sharing and Disclosure{'\n'}
        We do not sell your personal data to third parties. However, we may share your data with:{'\n'}
        - Other users, including students and instructors, through profiles, feedback, and ratings.{'\n'}
        - Service providers to help deliver and improve our services (e.g., cloud hosting, analytics).{'\n'}
        - Legal authorities if required by law to protect the safety and security of users.{'\n\n'}
        
        5. Data Security{'\n'}
        We implement industry-standard security measures to protect your personal data. However, no method of transmission over the internet is 100% secure.{'\n\n'}
        
        6. Your Choices and Rights{'\n'}
        You have the right to:{'\n'}
        - Access your data and update or correct inaccurate information in your profile.{'\n'}
        - Delete your account and personal data, subject to legal obligations.{'\n'}
        - Opt out of location services by disabling GPS access on your device.{'\n\n'}
        
        7. Changes to This Policy{'\n'}
        We may update this Privacy Policy from time to time. Changes will be posted on this page, and you are encouraged to review this page periodically.{'\n\n'}
        
        8. Contact Us{'\n'}
        If you have any questions or concerns about our Privacy Policy, please contact us at:{'\n'}
        Email: elitedriveacademy@outlook.com
      </Text>
    </ScrollView>
    <TouchableOpacity
      style={styles.closeButton}
      onPress={() => setGuidelinesVisible(false)}
    >
      <Text style={styles.closeButtonText}>Close</Text>
    </TouchableOpacity>
  </View>
</Modal>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    marginBottom: 10,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 10,
  },
  roleSelection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 18,
    marginBottom: 10,
    color: '#555',
  },
  roleButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRoleButton: {
    backgroundColor: '#4caf50',
  },
  roleText: {
    fontSize: 16,
    color: '#333',
  },
  selectedRoleText: {
    fontSize: 16,
    color: '#fff',
  },
  guidelineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  guidelineText: {
    fontSize: 18,
    marginLeft: 10,
    textDecorationLine: 'underline',
    color: '#007bff',
  },
  submitButton: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  toggleText: {
    textAlign: 'center',
    color: '#007bff',
    fontSize: 17,
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  guidelineContent: {
    fontSize: 16,
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default AuthScreen;
