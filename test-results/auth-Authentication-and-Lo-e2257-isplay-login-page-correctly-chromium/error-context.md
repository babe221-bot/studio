# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]: Prijava
      - generic [ref=e7]: Unesite svoju e-mail adresu za prijavu na račun
    - generic [ref=e8]:
      - generic [ref=e9]:
        - text: E-mail
        - textbox "E-mail" [ref=e10]:
          - /placeholder: vas@email.com
      - generic [ref=e11]:
        - text: Lozinka
        - textbox "Lozinka" [ref=e12]
    - generic [ref=e13]:
      - button "Prijavi se" [ref=e14] [cursor=pointer]
      - button "Registriraj se" [ref=e15] [cursor=pointer]
      - generic [ref=e16]: ili
      - link "Nastavi kao gost" [ref=e17] [cursor=pointer]:
        - /url: /api/guest-login
        - button "Nastavi kao gost" [ref=e18]
      - paragraph [ref=e19]: Gost ima pristup svim funkcijama. Podaci se ne čuvaju.
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e25] [cursor=pointer]:
    - img [ref=e26]
  - alert [ref=e29]
```