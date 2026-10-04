import { NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { hashPassword } from '../../../lib/auth';
import {
  AuthOtpError,
  createOtpChallenge,
  isValidEmail,
  isValidPassword,
  isValidUsername,
  normalizeEmail,
  normalizeUsername,
} from '../../../lib/auth-otp';

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, email, password } = body;

    // Validation
    if (!isValidUsername(username)) {
      return NextResponse.json(
        { error: 'Username must be 3-30 characters using letters, numbers, dots, dashes, or underscores' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'A valid email address is required' },
        { status: 400 }
      );
    }

    if (!isValidPassword(password)) {
      return NextResponse.json(
        { error: 'Password must be between 8 and 128 characters long' },
        { status: 400 }
      );
    }

    const cleanUsername = normalizeUsername(username);
    const cleanEmail = normalizeEmail(email);

    // Check if username or email is already taken
    const existingUserQuery = `
      SELECT user_id, username, email 
      FROM users 
      WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2)
      LIMIT 1;
    `;
    const existingResult = await pool.query(existingUserQuery, [cleanUsername, cleanEmail]);

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      if (existing.username.toLowerCase() === cleanUsername.toLowerCase()) {
        return NextResponse.json(
          { error: 'Username is already taken' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Email is already registered' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const challenge = await createOtpChallenge({
      purpose: 'registration',
      email: cleanEmail,
      payload: { username: cleanUsername, passwordHash },
      request,
    });

    return NextResponse.json({
      success: true,
      verificationRequired: true,
      message: 'We sent a verification code to your email address',
      ...challenge,
    }, { status: 202 });
  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof AuthOtpError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: 'Registration failed. Please try again later.' },
      { status: 500 }
    );
  }
}
