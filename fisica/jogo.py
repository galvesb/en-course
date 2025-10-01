import pygame

pygame.init()
scale = 4  # cada pixel será ampliado para facilitar a visualização
size = 16 * scale
screen = pygame.display.set_mode((size, size))
pygame.display.set_caption("Pixel Viking")

# Paleta de cores
palette = [
    (0, 0, 0, 0),       # 0 - transparente
    (232, 190, 134),    # 1 - pele
    (90, 77, 65),       # 2 - chifre/capacete/cinto
    (185, 122, 87),     # 3 - barba/cabelo
    (126, 63, 20),      # 4 - sombra da barba
    (60, 66, 97),       # 5 - roupa azul escura
    (148, 124, 92),     # 6 - bota/marrom claro
]

# Sprite do viking (veja acima)
viking_sprite = [
    [0,0,0,0,0,2,2,0,0,2,2,0,0,0,0,0],
    [0,0,0,0,2,2,2,2,2,2,2,2,0,0,0,0],
    [0,0,0,2,1,1,1,2,2,1,1,1,2,0,0,0],
    [0,0,2,1,1,1,1,2,2,1,1,1,1,2,0,0],
    [0,2,2,1,1,1,1,1,1,1,1,1,1,2,2,0],
    [0,2,1,3,3,1,1,1,1,1,3,3,1,1,2,0],
    [2,1,3,3,3,1,1,1,1,1,3,3,3,1,1,2],
    [2,1,3,4,3,1,1,1,1,1,3,4,3,1,1,2],
    [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    [2,1,5,1,1,5,1,1,1,1,5,1,1,5,1,2],
    [0,2,5,5,5,5,5,5,5,5,5,5,5,5,2,0],
    [0,2,6,6,6,6,6,6,6,6,6,6,6,6,2,0],
    [0,2,6,6,0,0,0,0,0,0,0,6,6,2,0,0],
    [0,0,2,6,0,0,0,0,0,0,0,6,2,0,0,0],
    [0,0,2,2,0,0,0,0,0,0,0,2,2,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
]


def draw_sprite(sprite, palette, surface, scale=1):
    for y, row in enumerate(sprite):
        for x, color in enumerate(row):
            if color == 0:
                continue  # transparente
            pygame.draw.rect(
                surface,
                palette[color][:3],
                pygame.Rect(x*scale, y*scale, scale, scale)
            )

# Loop principal
running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    screen.fill((60, 44, 38))
    draw_sprite(viking_sprite, palette, screen, scale)
    pygame.display.flip()

pygame.quit()
