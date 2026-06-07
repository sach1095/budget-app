import { Injectable, inject } from '@angular/core';
import {
  Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, user, RecaptchaVerifier, signInWithPhoneNumber,
  ConfirmationResult, updateProfile
} from '@angular/fire/auth';
import { Router } from '@angular/router';
import { from, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private router = inject(Router);

  user$ = user(this.auth);
  private confirmationResult: ConfirmationResult | null = null;
  private recaptchaVerifier: RecaptchaVerifier | null = null;

  get currentUser() { return this.auth.currentUser; }

  login(email: string, password: string) {
    return from(signInWithEmailAndPassword(this.auth, email, password));
  }

  register(email: string, password: string, displayName?: string) {
    return from(
      createUserWithEmailAndPassword(this.auth, email, password).then(async cred => {
        if (displayName) await updateProfile(cred.user, { displayName });
        return cred;
      })
    );
  }

  async setupRecaptcha(containerId: string) {
    if (this.recaptchaVerifier) { this.recaptchaVerifier.clear(); }
    this.recaptchaVerifier = new RecaptchaVerifier(this.auth, containerId, { size: 'invisible' });
    await this.recaptchaVerifier.render();
  }

  async sendPhoneSMS(phone: string): Promise<void> {
    if (!this.recaptchaVerifier) throw new Error('reCAPTCHA not initialized');
    this.confirmationResult = await signInWithPhoneNumber(this.auth, phone, this.recaptchaVerifier);
  }

  async confirmPhoneCode(code: string) {
    if (!this.confirmationResult) throw new Error('No confirmation result');
    return this.confirmationResult.confirm(code);
  }

  logout() {
    return from(signOut(this.auth)).subscribe(() => this.router.navigate(['/']));
  }
}
