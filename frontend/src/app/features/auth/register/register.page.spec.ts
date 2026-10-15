import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RegisterPage } from './register.page';

describe('Inscription via API', () => {
  let fixture: ComponentFixture<RegisterPage>;
  let http: HttpTestingController;
  const endpoint = 'http://localhost:3000/api/auth/register';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(RegisterPage);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    ['Jean Dupont', 'jean@example.com', 'MotDePasse123', 'MotDePasse123'].forEach((value, index) => {
      inputs[index].value = value;
      inputs[index].dispatchEvent(new Event('input', { bubbles: true }));
    });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function submit(): void {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  it('envoie les champs attendus et affiche le succès après un 201', () => {
    submit();
    const request = http.expectOne(endpoint);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ nom: 'Dupont', prenom: 'Jean', email: 'jean@example.com', password: 'MotDePasse123', role: 'demandeur' });
    request.flush({ user: { id: 1 } }, { status: 201, statusText: 'Created' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('créé avec succès');
  });

  it('affiche le message 400 et permet de réessayer', () => {
    submit();
    http.expectOne(endpoint).flush({ message: 'Champs manquants ou invalides : nom.' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.message.error').textContent).toContain('Champs manquants ou invalides : nom.');
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
  });

  it('bloque une seconde soumission tant que la requête est en cours', () => {
    submit();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    submit();
    const request = http.expectOne(endpoint);
    request.flush({ user: { id: 1 } }, { status: 201, statusText: 'Created' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
  });
});
