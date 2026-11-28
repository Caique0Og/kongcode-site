import { z } from "zod";
export const orderSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string().trim().min(1).max(200),
  size: z.string().trim().min(1, "Escolha um tamanho").max(30),
  color: z.string().trim().max(60).optional().or(z.literal("")),
  fullName: z.string().trim().min(3, "Informe seu nome completo").max(120),
  ra: z
    .string()
    .trim()
    .regex(/^\d{0,20}$/, "O RA deve conter apenas números")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(/^[\d\s()+-]{8,25}$/, "Informe um telefone válido"),
  email: z.string().trim().email("Informe um e-mail válido").max(255),
});
export type OrderInput = z.infer<typeof orderSchema>;
