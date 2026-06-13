import { Injectable, inject } from '@angular/core';
import {
  Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, user, RecaptchaVerifier, signInWithPhoneNumber,
  ConfirmationResult, updateProfile,
  linkWithCredential, linkWithPhoneNumber, EmailAuthProvider
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

  /** Connexion par SMS avec initialisation du reCAPTCHA sur un container donné */
  async sendPhoneSMSWithContainer(phone: string, containerId: string): Promise<void> {
    if (this.recaptchaVerifier) {
      try { this.recaptchaVerifier.clear(); } catch {}
      this.recaptchaVerifier = null;
    }
    const wrapper = document.getElementById(containerId);
    if (!wrapper) throw new Error(`Container #${containerId} introuvable`);
    const fresh = document.createElement('div');
    wrapper.replaceChildren(fresh);
    this.recaptchaVerifier = new RecaptchaVerifier(this.auth, fresh, { size: 'invisible' });
    await this.recaptchaVerifier.render();
    try {
      this.confirmationResult = await signInWithPhoneNumber(this.auth, phone, this.recaptchaVerifier);
    } catch (e: any) {
      const msg = (e?.message ?? '') + (e?.code ?? '');
      if (msg.includes('OPERATION_NOT_ALLOWED')) throw { code: 'auth/operation-not-allowed' };
      if (msg.includes('INVALID_APP_CREDENTIAL')) throw { code: 'auth/invalid-app-credential' };
      if (msg.includes('INVALID_PHONE_NUMBER')) throw { code: 'auth/invalid-phone-number' };
      throw e;
    }
  }

  async confirmPhoneCode(code: string) {
    if (!this.confirmationResult) throw new Error('No confirmation result');
    return this.confirmationResult.confirm(code);
  }

  /** Providers déjà liés au compte courant */
  linkedProviders(): string[] {
    return this.auth.currentUser?.providerData.map(p => p.providerId) ?? [];
  }

  /** Lier un email+mot de passe au compte existant */
  async linkEmail(email: string, password: string) {
    const u = this.auth.currentUser;
    if (!u) throw new Error('Non connecté');
    const credential = EmailAuthProvider.credential(email, password);
    return linkWithCredential(u, credential);
  }

  /** Lier un numéro de téléphone — envoie le SMS.
   *  containerId doit être déjà dans le DOM avant l'appel. */
  async linkPhoneSend(phone: string, containerId: string): Promise<void> {
    const u = this.auth.currentUser;
    if (!u) throw new Error('Non connecté');

    // Détruire l'ancien verifier et vider le container pour éviter les conflits
    if (this.recaptchaVerifier) {
      try { this.recaptchaVerifier.clear(); } catch {}
      this.recaptchaVerifier = null;
    }
    // Remplacer le container par un élément tout neuf — reCAPTCHA garde des refs internes
    const wrapper = document.getElementById(containerId);
    if (!wrapper) throw new Error(`Élément reCAPTCHA introuvable (#${containerId})`);
    const fresh = document.createElement('div');
    wrapper.replaceChildren(fresh);

    this.recaptchaVerifier = new RecaptchaVerifier(this.auth, fresh, { size: 'invisible' });
    // render() sur l'élément frais initialise le widgetId — linkWithPhoneNumber réutilise
    // le widget existant sans tenter de le re-créer (évite "already rendered")
    await this.recaptchaVerifier.render();

    try {
      this.confirmationResult = await linkWithPhoneNumber(u, phone, this.recaptchaVerifier);
    } catch (e: any) {
      const msg = (e?.message ?? '') + (e?.code ?? '');
      if (msg.includes('OPERATION_NOT_ALLOWED') || msg.includes('operation-not-allowed')) {
        throw { code: 'auth/operation-not-allowed' };
      }
      if (msg.includes('INVALID_APP_CREDENTIAL') || msg.includes('invalid-app-credential')) {
        throw { code: 'auth/invalid-app-credential' };
      }
      if (msg.includes('INVALID_PHONE_NUMBER') || msg.includes('invalid-phone-number')) {
        throw { code: 'auth/invalid-phone-number' };
      }
      throw e;
    }
  }

  /** Confirmer le code SMS pour lier le téléphone */
  async linkPhoneConfirm(code: string) {
    if (!this.confirmationResult) throw new Error('Pas de confirmation en attente');
    return this.confirmationResult.confirm(code);
  }

  logout() {
    return from(signOut(this.auth)).subscribe(() => this.router.navigate(['/']));
  }
}
