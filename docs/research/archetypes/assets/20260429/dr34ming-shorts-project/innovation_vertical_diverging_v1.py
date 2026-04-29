from manim import *
import numpy as np

class AIGeneratedScene(Scene):
    def setup(self):
        # Set vertical format for YouTube Shorts
        self.camera.frame_height = 16
        self.camera.frame_width = 9
    
    def construct(self):
        # Color palette
        INNOVATION_GOLD = "#FFD700"
        LEADER_BLUE = "#00BFFF"
        FOLLOWER_GRAY = "#666666"
        BG_DARK = "#0a0a0f"
        GLOW_COLOR = "#FF6B35"
        
        # Background
        self.camera.background_color = BG_DARK
        
        # Create subtle grid background
        grid_lines = VGroup()
        for i in range(-8, 9):
            line = Line(
                start=np.array([i * 0.5, -8, 0]),
                end=np.array([i * 0.5, 8, 0]),
                stroke_width=0.3,
                stroke_opacity=0.1,
                color=WHITE
            )
            grid_lines.add(line)
        for i in range(-16, 17):
            line = Line(
                start=np.array([-4.5, i * 0.5, 0]),
                end=np.array([4.5, i * 0.5, 0]),
                stroke_width=0.3,
                stroke_opacity=0.1,
                color=WHITE
            )
            grid_lines.add(line)
        self.add(grid_lines)
        
        # ============ SEGMENT 1: "Innovation distinguishes" (0.0s - 3.5s) ============
        
        # Create glowing innovation text
        innovation_text = Text(
            "INNOVATION",
            font_size=72,
            font="Arial",
            weight=BOLD,
            color=INNOVATION_GOLD
        ).move_to(UP * 4)
        
        # Glow effect for innovation
        innovation_glow = innovation_text.copy()
        innovation_glow.set_color(GLOW_COLOR)
        innovation_glow.set_opacity(0.5)
        innovation_glow.scale(1.05)
        
        # Distinguishes text
        distinguishes_text = Text(
            "distinguishes",
            font_size=48,
            color=WHITE
        ).next_to(innovation_text, DOWN, buff=0.8)
        
        # Particle burst effect
        particles = VGroup()
        for _ in range(20):
            angle = np.random.uniform(0, 2 * PI)
            radius = np.random.uniform(0.5, 2)
            particle = Dot(
                point=innovation_text.get_center() + np.array([
                    radius * np.cos(angle),
                    radius * np.sin(angle),
                    0
                ]),
                radius=0.03,
                color=INNOVATION_GOLD
            ).set_opacity(0)
            particles.add(particle)
        
        # Light rays emanating from innovation
        rays = VGroup()
        for i in range(8):
            angle = i * PI / 4
            ray = Line(
                start=innovation_text.get_center(),
                end=innovation_text.get_center() + 3 * np.array([np.cos(angle), np.sin(angle), 0]),
                stroke_width=3,
                color=INNOVATION_GOLD
            ).set_opacity(0)
            rays.add(ray)
        
        # Animate segment 1
        self.play(
            FadeIn(innovation_glow, scale=1.5),
            FadeIn(innovation_text, scale=1.5),
            run_time=0.8
        )
        
        self.play(
            *[ray.animate.set_opacity(0.3) for ray in rays],
            *[particle.animate.set_opacity(0.8) for particle in particles],
            run_time=0.5
        )
        
        self.play(
            Write(distinguishes_text),
            *[ray.animate.set_opacity(0) for ray in rays],
            *[particle.animate.shift(UP * 2).set_opacity(0) for particle in particles],
            run_time=1.2
        )
        
        self.wait(1.0)
        
        # ============ SEGMENT 2: "between a leader" (3.5s - 7.0s) ============
        
        # Create diverging paths
        path_start = DOWN * 1
        
        # Leader path - ascending
        leader_path = VMobject()
        leader_path.set_points_smoothly([
            path_start,
            path_start + UP * 1 + RIGHT * 0.5,
            path_start + UP * 2.5 + RIGHT * 1,
            path_start + UP * 4 + RIGHT * 0.5,
        ])
        leader_path.set_color(LEADER_BLUE)
        leader_path.set_stroke(width=4)
        
        # Leader icon (star/diamond shape)
        leader_icon = VGroup(
            RegularPolygon(n=4, color=LEADER_BLUE, fill_opacity=1).scale(0.3),
            Circle(radius=0.15, color=WHITE, fill_opacity=0.8)
        ).move_to(path_start)
        
        # Leader glow
        leader_glow = Circle(radius=0.5, color=LEADER_BLUE, fill_opacity=0.3, stroke_width=0).move_to(path_start)
        
        # "LEADER" text
        leader_text = Text(
            "LEADER",
            font_size=56,
            font="Arial",
            weight=BOLD,
            color=LEADER_BLUE
        ).move_to(RIGHT * 1.5 + UP * 3)
        
        # Between text
        between_text = Text(
            "between a",
            font_size=40,
            color=WHITE
        ).move_to(LEFT * 1.5 + DOWN * 2)
        
        # Animate segment 2
        self.play(
            FadeIn(between_text),
            run_time=0.6
        )
        
        self.play(
            Create(leader_path),
            FadeIn(leader_icon),
            FadeIn(leader_glow),
            run_time=1.0
        )
        
        # Animate leader ascending
        self.play(
            MoveAlongPath(leader_icon, leader_path),
            MoveAlongPath(leader_glow, leader_path),
            leader_glow.animate.scale(1.5).set_opacity(0.5),
            run_time=1.2
        )
        
        self.play(
            Write(leader_text),
            leader_icon.animate.scale(1.3),
            Flash(leader_icon, color=LEADER_BLUE, line_length=0.3),
            run_time=0.7
        )
        
        # ============ SEGMENT 3: "and a follower" (7.0s - 12.0s) ============
        
        # Follower path - stays low
        follower_path = VMobject()
        follower_path.set_points_smoothly([
            path_start,
            path_start + DOWN * 0.5 + LEFT * 0.5,
            path_start + DOWN * 1 + LEFT * 1.5,
            path_start + DOWN * 1.5 + LEFT * 1,
        ])
        follower_path.set_color(FOLLOWER_GRAY)
        follower_path.set_stroke(width=3)
        
        # Follower icon (simple circle, less prominent)
        follower_icon = Circle(
            radius=0.2,
            color=FOLLOWER_GRAY,
            fill_opacity=0.6
        ).move_to(path_start)
        
        # "FOLLOWER" text
        follower_text = Text(
            "follower",
            font_size=44,
            color=FOLLOWER_GRAY
        ).move_to(LEFT * 1.5 + DOWN * 4)
        
        # "and a" text
        and_text = Text(
            "and a",
            font_size=40,
            color=WHITE
        ).move_to(DOWN * 3)
        
        # Animate segment 3
        self.play(
            FadeIn(and_text),
            run_time=0.5
        )
        
        self.play(
            Create(follower_path),
            FadeIn(follower_icon),
            run_time=0.8
        )
        
        self.play(
            MoveAlongPath(follower_icon, follower_path),
            run_time=1.0
        )
        
        self.play(
            Write(follower_text),
            run_time=0.6
        )
        
        # Create visual contrast - highlight the gap
        gap_arrow = Arrow(
            start=follower_icon.get_center() + UP * 0.5,
            end=leader_icon.get_center() + DOWN * 0.5,
            color=INNOVATION_GOLD,
            stroke_width=2,
            buff=0.3
        )
        
        gap_label = Text(
            "THE GAP",
            font_size=28,
            color=INNOVATION_GOLD
        ).next_to(gap_arrow, RIGHT, buff=0.2)
        
        # Final dramatic effect
        self.play(
            innovation_text.animate.set_color(WHITE).scale(0.8),
            innovation_glow.animate.set_opacity(0),
            run_time=0.5
        )
        
        self.play(
            GrowArrow(gap_arrow),
            FadeIn(gap_label),
            leader_icon.animate.set_color(INNOVATION_GOLD),
            Flash(leader_icon, color=INNOVATION_GOLD, line_length=0.4, num_lines=12),
            run_time=1.0
        )
        
        # Pulse effect on innovation
        self.play(
            innovation_text.animate.scale(1.1).set_color(INNOVATION_GOLD),
            leader_text.animate.set_color(INNOVATION_GOLD),
            run_time=0.4
        )
        
        self.play(
            innovation_text.animate.scale(1/1.1),
            run_time=0.4
        )
        
        # Final hold with subtle breathing animation
        self.play(
            leader_glow.animate.scale(1.2).set_opacity(0.3),
            run_time=0.8
        )
        
        self.wait(0.5)