# AI Prompt Engineering & CAD Context

The Studio platform uses a "CAD-Aware" AI architecture to provide relevant design feedback.

## 1. The `buildCADContext` Strategy
The frontend continuously builds a textual representation of the current design state. This is injected into the system prompt of the LLM.

**Context includes:**
*   Active items in the cart (dimensions, material).
*   Current selection in the configurator.
*   **Safety Warnings:** Structural analysis from the backend (e.g., "Slab is too heavy").

## 2. Prompt Injection Logic
In `src/lib/cad-context.ts`, the state is transformed:
```typescript
parts.push(`Kupac trenutno konfigurira: ${material.name} ploča`);
parts.push(`Dimenzije: ${length}x${width}x${height} cm`);
if (warnings.length > 0) {
   parts.push(`STRUKTURNA UPOZORENJA: ${warnings.map(w => w.message).join(', ')}`);
}
```

## 3. Encouraged AI Behaviors
The AI is instructed to:
1.  **Validate Dimensions:** If a user asks for a 4-meter long slab, the AI should mention transport and structural risks.
2.  **Suggest Complements:** "You have a countertop; would you like to add a matching 2cm backsplash?"
3.  **Explain Manufacturing:** Interpret technical terms like "Smuš" (chamfer) for the user.
