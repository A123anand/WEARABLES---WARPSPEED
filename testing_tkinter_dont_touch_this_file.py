from tkinter import Tk, Frame, Button

def make_a_button():
    root = Tk()
    root.title("Warpspeed Test Window")
    root.geometry("400x300")

    frame = Frame(root)
    frame.pack(expand=True, fill="both")

    button = Button(frame, text="Geek")
    button.pack()

    root.mainloop()

make_a_button()



