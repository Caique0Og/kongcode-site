import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { cleanList, ListEditor } from "@/components/atletica/admin-section";

function Harness({ initial }: { initial: string[] }) {
  const [values, setValues] = useState(initial);
  return (
    <>
      <ListEditor id="colors" values={values} placeholder="Ex.: Azul" onChange={setValues} />
      <output data-testid="saved">{JSON.stringify(cleanList(values))}</output>
    </>
  );
}

describe("ListEditor (cores/modelos e tamanhos no painel)", () => {
  it("adiciona uma caixinha nova com o botão + e guarda cada opção", () => {
    render(<Harness initial={["Azul"]} />);
    fireEvent.click(screen.getByRole("button", { name: /adicionar opção/i }));
    const boxes = screen.getAllByPlaceholderText("Ex.: Azul");
    expect(boxes).toHaveLength(2);
    fireEvent.change(boxes[1]!, { target: { value: "Preta" } });
    expect(screen.getByTestId("saved").textContent).toBe('["Azul","Preta"]');
  });

  it("aceita texto com espaço e vírgula dentro de uma opção", () => {
    render(<Harness initial={[]} />);
    const box = screen.getByPlaceholderText("Ex.: Azul");
    fireEvent.change(box, { target: { value: "Azul marinho, logo branco" } });
    expect(screen.getByTestId("saved").textContent).toBe('["Azul marinho, logo branco"]');
  });

  it("remove uma opção com o x e ignora caixinhas vazias e repetidas", () => {
    render(<Harness initial={["Azul", "", "Azul", "Preta"]} />);
    expect(screen.getByTestId("saved").textContent).toBe('["Azul","Preta"]');
    fireEvent.click(screen.getAllByRole("button", { name: /remover opção/i })[0]!);
    expect(screen.getAllByPlaceholderText("Ex.: Azul")).toHaveLength(3);
  });

  it("Enter na caixinha cria a próxima", () => {
    render(<Harness initial={["P"]} />);
    fireEvent.keyDown(screen.getByPlaceholderText("Ex.: Azul"), { key: "Enter" });
    expect(screen.getAllByPlaceholderText("Ex.: Azul")).toHaveLength(2);
  });
});
